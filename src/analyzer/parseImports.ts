import ts from 'typescript';
import type {
  DynamicImportReference,
  FileAnalysisResult,
  StaticImportKind,
  StaticImportReference,
} from './types';

/**
 * Determines the TypeScript ScriptKind based on the file extension.
 * Defaults to TSX to safely parse JSX and TypeScript syntax.
 */
function resolveScriptKind(filePath: string): ts.ScriptKind {
  const lowerPath = filePath.toLowerCase();
  if (lowerPath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (lowerPath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (lowerPath.endsWith('.ts')) return ts.ScriptKind.TS;
  if (lowerPath.endsWith('.js') || lowerPath.endsWith('.mjs') || lowerPath.endsWith('.cjs')) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TSX;
}

/**
 * Analyzes a JavaScript or TypeScript source file to extract static module imports,
 * re-exports with origin in another module, and dynamic imports.
 *
 * Grounded in the official TypeScript Compiler API:
 * https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
 *
 * shortcut: syntactic AST extraction only without ts.Program or path resolution, upgrade in Phase 2.2 when resolving alias and workspace paths.
 *
 * @param filePath Path or filename (used for extension detection and diagnostics).
 * @param content Source code string to parse.
 * @returns FileAnalysisResult containing static and dynamic import references.
 */
export function analyzeFileDependencies(
  filePath: string,
  content: string
): FileAnalysisResult {
  // JSON files contain static data, not executable imports or exports
  if (filePath.toLowerCase().endsWith('.json')) {
    return {
      filePath,
      staticImports: [],
      dynamicImports: [],
      exports: [],
    };
  }

  const scriptKind = resolveScriptKind(filePath);

  // Helper to extract text from regular string literals or untemplated backtick literals
  function getLiteralText(node: ts.Node): string | undefined {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }
    return undefined;
  }

  // Parse source text into a TypeScript AST (Abstract Syntax Tree).
  // Pure syntactic analysis without typechecking/binder overhead.
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  const staticImports: StaticImportReference[] = [];
  const dynamicImports: DynamicImportReference[] = [];
  const exportsList: string[] = [];

  function getLineNumber(node: ts.Node): number {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  }

  function visit(node: ts.Node): void {
    // 1. Static Imports: import ... from '...'
    if (ts.isImportDeclaration(node)) {
      const specifier = node.moduleSpecifier ? getLiteralText(node.moduleSpecifier) : undefined;
      if (specifier) {
        const sourceLine = getLineNumber(node);
        const isTypeOnly = Boolean(node.importClause?.isTypeOnly);
        const symbols: string[] = [];
        let kind: StaticImportKind = 'side-effect';

        if (node.importClause) {
          if (node.importClause.name) {
            symbols.push(node.importClause.name.text);
            kind = 'default';
          }

          if (node.importClause.namedBindings) {
            if (ts.isNamespaceImport(node.importClause.namedBindings)) {
              symbols.push(node.importClause.namedBindings.name.text);
              kind = 'namespace';
            } else if (ts.isNamedImports(node.importClause.namedBindings)) {
              for (const element of node.importClause.namedBindings.elements) {
                symbols.push(element.name.text);
              }
              kind = 'named';
            }
          }
        }

        staticImports.push({
          specifier,
          kind,
          isTypeOnly,
          isReexport: false,
          symbols,
          sourceLine,
        });
      }
    }

    // 2. Re-exports or Local Exports: export ...
    else if (ts.isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier ? getLiteralText(node.moduleSpecifier) : undefined;
      if (specifier) {
        const sourceLine = getLineNumber(node);
        const isTypeOnly = Boolean(node.isTypeOnly);
        const symbols: string[] = [];

        if (node.exportClause) {
          if (ts.isNamedExports(node.exportClause)) {
            for (const element of node.exportClause.elements) {
              symbols.push(element.name.text);
              exportsList.push(element.name.text);
            }
          } else if (ts.isNamespaceExport(node.exportClause)) {
            symbols.push(node.exportClause.name.text);
            exportsList.push(node.exportClause.name.text);
          }
        } else {
          // export * from './module'
          symbols.push('*');
          exportsList.push('*');
        }

        staticImports.push({
          specifier,
          kind: 'reexport',
          isTypeOnly,
          isReexport: true,
          symbols,
          sourceLine,
        });
      } else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        // Local export: export { a, b as c }
        for (const element of node.exportClause.elements) {
          exportsList.push(element.name.text);
        }
      }
    }

    // 3. Export default assignment: export default ...
    else if (ts.isExportAssignment(node)) {
      exportsList.push('default');
    }

    // 4. Declarations with export keyword (functions, classes, const, types, etc.)
    else if (ts.canHaveModifiers(node)) {
      const modifiers = ts.getModifiers(node);
      const isExport = modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      const isDefault = modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);

      if (isExport) {
        if (isDefault) {
          exportsList.push('default');
        } else if (
          ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isTypeAliasDeclaration(node) ||
          ts.isEnumDeclaration(node)
        ) {
          if (node.name) {
            exportsList.push(node.name.text);
          }
        } else if (ts.isVariableStatement(node)) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              exportsList.push(decl.name.text);
            }
          }
        }
      }
    }

    // 5. Dynamic Imports: import(...)
    else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const sourceLine = getLineNumber(node);
        const argument = node.arguments[0];
        const specifier = argument ? getLiteralText(argument) : undefined;

        if (specifier) {
          dynamicImports.push({
            specifier,
            isDynamicExpression: false,
            sourceLine,
          });
        } else {
          dynamicImports.push({
            specifier: undefined,
            isDynamicExpression: true,
            sourceLine,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return {
    filePath,
    staticImports,
    dynamicImports,
    exports: Array.from(new Set(exportsList)),
  };
}
