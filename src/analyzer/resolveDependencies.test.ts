import { describe, expect, it } from 'vitest';
import { resolveDependencies, resolveModuleSpecifier } from './resolveDependencies';
import type { PathResolutionOptions } from './types';

describe('resolveDependencies', () => {
  const mockWorkspaceFiles = [
    'src/main.tsx',
    'src/App.tsx',
    'src/index.css',
    'src/components/Header.tsx',
    'src/components/Sidebar.tsx',
    'src/components/common/Button.tsx',
    'src/components/common/index.ts',
    'src/hooks/useTheme.ts',
    'src/utils/helpers.ts',
    'src/utils/formatters.js',
    'src/services/api/index.tsx',
    'src/types/index.d.ts',
    'package.json',
  ];

  const defaultOptions: PathResolutionOptions = {
    workspaceFiles: mockWorkspaceFiles,
    knownExternalPackages: ['react', 'react-dom', '@xyflow/react', 'lodash'],
  };

  describe('resolveModuleSpecifier', () => {
    it('resolves simple relative imports with extension inference (.tsx, .ts, .js)', () => {
      // From src/components/Header.tsx -> ./Sidebar -> src/components/Sidebar.tsx
      const res1 = resolveModuleSpecifier(
        './Sidebar',
        'src/components/Header.tsx',
        defaultOptions
      );
      expect(res1.type).toBe('internal');
      expect(res1.resolvedPath).toBe('src/components/Sidebar.tsx');

      // From src/components/Header.tsx -> ../utils/helpers -> src/utils/helpers.ts
      const res2 = resolveModuleSpecifier(
        '../utils/helpers',
        'src/components/Header.tsx',
        defaultOptions
      );
      expect(res2.type).toBe('internal');
      expect(res2.resolvedPath).toBe('src/utils/helpers.ts');

      // From src/App.tsx -> ./utils/formatters -> src/utils/formatters.js
      const res3 = resolveModuleSpecifier(
        './utils/formatters',
        'src/App.tsx',
        defaultOptions
      );
      expect(res3.type).toBe('internal');
      expect(res3.resolvedPath).toBe('src/utils/formatters.js');
    });

    it('resolves explicit file extensions (.css, .tsx, .d.ts)', () => {
      const resCss = resolveModuleSpecifier(
        './index.css',
        'src/main.tsx',
        defaultOptions
      );
      expect(resCss.type).toBe('internal');
      expect(resCss.resolvedPath).toBe('src/index.css');

      const resTypes = resolveModuleSpecifier(
        '../types/index.d.ts',
        'src/components/Header.tsx',
        defaultOptions
      );
      expect(resTypes.type).toBe('internal');
      expect(resTypes.resolvedPath).toBe('src/types/index.d.ts');
    });

    it('resolves directory imports to index files (index.ts, index.tsx)', () => {
      // ./common -> src/components/common/index.ts
      const resIndexTs = resolveModuleSpecifier(
        './common',
        'src/components/Header.tsx',
        defaultOptions
      );
      expect(resIndexTs.type).toBe('internal');
      expect(resIndexTs.resolvedPath).toBe('src/components/common/index.ts');

      // ../services/api -> src/services/api/index.tsx
      const resIndexTsx = resolveModuleSpecifier(
        '../services/api',
        'src/components/Header.tsx',
        defaultOptions
      );
      expect(resIndexTsx.type).toBe('internal');
      expect(resIndexTsx.resolvedPath).toBe('src/services/api/index.tsx');
    });

    it('resolves compilerOptions.paths aliases with wildcards (*)', () => {
      const optionsWithPaths: PathResolutionOptions = {
        ...defaultOptions,
        paths: {
          '@/*': ['src/*'],
          '~/*': ['./src/*'],
        },
      };

      const res1 = resolveModuleSpecifier(
        '@/components/common/Button',
        'src/App.tsx',
        optionsWithPaths
      );
      expect(res1.type).toBe('internal');
      expect(res1.resolvedPath).toBe('src/components/common/Button.tsx');

      const res2 = resolveModuleSpecifier(
        '~/hooks/useTheme',
        'src/components/Header.tsx',
        optionsWithPaths
      );
      expect(res2.type).toBe('internal');
      expect(res2.resolvedPath).toBe('src/hooks/useTheme.ts');
    });

    it('resolves compilerOptions.paths exact aliases without wildcards', () => {
      const optionsWithExactPaths: PathResolutionOptions = {
        ...defaultOptions,
        paths: {
          '@helpers': ['src/utils/helpers.ts'],
        },
      };

      const res = resolveModuleSpecifier(
        '@helpers',
        'src/components/Header.tsx',
        optionsWithExactPaths
      );
      expect(res.type).toBe('internal');
      expect(res.resolvedPath).toBe('src/utils/helpers.ts');
    });

    it('tolerates paths where target is configured as a single string instead of array or has leading slash', () => {
      const optionsWithStringTarget: PathResolutionOptions = {
        ...defaultOptions,
        paths: {
          '@/*': 'src/*' as unknown as string[],
          '@button': '/src/components/common/Button.tsx' as unknown as string[],
        },
      };

      const resWildcard = resolveModuleSpecifier(
        '@/components/Header',
        'src/App.tsx',
        optionsWithStringTarget
      );
      expect(resWildcard.type).toBe('internal');
      expect(resWildcard.resolvedPath).toBe('src/components/Header.tsx');

      const resExact = resolveModuleSpecifier(
        '@button',
        'src/App.tsx',
        optionsWithStringTarget
      );
      expect(resExact.type).toBe('internal');
      expect(resExact.resolvedPath).toBe('src/components/common/Button.tsx');
    });

    it('resolves aliases pointing to another folder outside src (e.g. shared/* or lib/*)', () => {
      const optionsOtherFolder: PathResolutionOptions = {
        workspaceFiles: [
          ...mockWorkspaceFiles,
          'packages/shared/constants.ts',
          'legacy/oldHelper.js',
        ],
        paths: {
          '@shared/*': ['packages/shared/*'],
          '@legacy/*': ['./legacy/*'],
        },
      };

      const res1 = resolveModuleSpecifier(
        '@shared/constants',
        'src/App.tsx',
        optionsOtherFolder
      );
      expect(res1.type).toBe('internal');
      expect(res1.resolvedPath).toBe('packages/shared/constants.ts');

      const res2 = resolveModuleSpecifier(
        '@legacy/oldHelper',
        'src/App.tsx',
        optionsOtherFolder
      );
      expect(res2.type).toBe('internal');
      expect(res2.resolvedPath).toBe('legacy/oldHelper.js');
    });

    it('flags non-existent target in alias as unresolved without misclassifying as external', () => {
      const optionsWithPaths: PathResolutionOptions = {
        ...defaultOptions,
        paths: {
          '@/*': ['src/*'],
        },
      };

      const res = resolveModuleSpecifier(
        '@/lib/NonExistentFile',
        'src/App.tsx',
        optionsWithPaths
      );
      expect(res.type).toBe('unresolved');
      expect(res.resolvedPath).toBeUndefined();
      expect(res.diagnosticNote).toContain('Módulo do alias "@/lib/NonExistentFile" não localizado no workspace');
    });

    it('resolves cleanly in projects without any aliases configured', () => {
      const optionsNoPaths: PathResolutionOptions = {
        ...defaultOptions,
        paths: undefined,
        baseUrl: undefined,
      };

      // Relative import still works
      const resRel = resolveModuleSpecifier('./Sidebar', 'src/components/Header.tsx', optionsNoPaths);
      expect(resRel.type).toBe('internal');
      expect(resRel.resolvedPath).toBe('src/components/Sidebar.tsx');

      // External import still works
      const resExt = resolveModuleSpecifier('react', 'src/App.tsx', optionsNoPaths);
      expect(resExt.type).toBe('external');

      // Unresolved alias is flagged as unresolvable internal/external, never crashed
      const resUnknown = resolveModuleSpecifier('@/lib/utils', 'src/App.tsx', optionsNoPaths);
      expect(resUnknown.type).toBe('unresolved');
    });

    it('resolves compilerOptions.baseUrl non-relative imports', () => {
      const optionsWithBaseUrl: PathResolutionOptions = {
        ...defaultOptions,
        baseUrl: 'src',
      };

      const res = resolveModuleSpecifier(
        'components/Sidebar',
        'src/App.tsx',
        optionsWithBaseUrl
      );
      expect(res.type).toBe('internal');
      expect(res.resolvedPath).toBe('src/components/Sidebar.tsx');
    });

    it('identifies external npm packages and node built-ins', () => {
      // standard npm package
      const resReact = resolveModuleSpecifier('react', 'src/App.tsx', defaultOptions);
      expect(resReact.type).toBe('external');
      expect(resReact.resolvedPath).toBeUndefined();

      // scoped npm package
      const resScoped = resolveModuleSpecifier('@xyflow/react', 'src/App.tsx', defaultOptions);
      expect(resScoped.type).toBe('external');

      // subpath of npm package
      const resSubpath = resolveModuleSpecifier('react-dom/client', 'src/main.tsx', defaultOptions);
      expect(resSubpath.type).toBe('external');

      // Node built-in
      const resNode = resolveModuleSpecifier('node:path', 'src/App.tsx', defaultOptions);
      expect(resNode.type).toBe('external');

      const resPath = resolveModuleSpecifier('path', 'src/App.tsx', defaultOptions);
      expect(resPath.type).toBe('external');
    });

    it('marks non-existent files as unresolved with clear diagnostic notes', () => {
      // relative non-existent
      const resMissing = resolveModuleSpecifier(
        './MissingParser',
        'src/components/Header.tsx',
        defaultOptions
      );
      expect(resMissing.type).toBe('unresolved');
      expect(resMissing.resolvedPath).toBeUndefined();
      expect(resMissing.diagnosticNote).toContain('não localizado no workspace');

      // mapped alias pointing to non-existent file
      const optionsWithPaths: PathResolutionOptions = {
        ...defaultOptions,
        paths: {
          '@/*': ['src/*'],
        },
      };
      const resMissingAlias = resolveModuleSpecifier(
        '@/components/NonExistentComponent',
        'src/App.tsx',
        optionsWithPaths
      );
      expect(resMissingAlias.type).toBe('unresolved');
      expect(resMissingAlias.diagnosticNote).toContain('não localizado no workspace');
    });

    it('handles ambiguous, unescapable, or invalid path attempts securely', () => {
      // Traversal attempting to escape workspace root
      const resEscape = resolveModuleSpecifier(
        '../../../../etc/passwd',
        'src/App.tsx',
        defaultOptions
      );
      expect(resEscape.type).toBe('unresolved');
      expect(resEscape.diagnosticNote).toBeDefined();

      // Empty string
      const resEmpty = resolveModuleSpecifier('', 'src/App.tsx', defaultOptions);
      expect(resEmpty.type).toBe('unresolved');
    });
  });

  describe('resolveDependencies (end-to-end integration with AST analysis)', () => {
    it('resolves static imports and preserves dynamic imports separately without classifying them as resolved static dependencies', () => {
      const code = `
        import React from 'react';
        import { Header } from './components/Header';
        import './index.css';
        import { Missing } from './MissingModule';

        const DynamicModal = React.lazy(() => import('./components/Sidebar'));
        const runtimeModule = (lang: string) => import(\`./locales/\${lang}\`);
      `;

      const result = resolveDependencies(
        'src/App.tsx',
        code,
        defaultOptions
      );

      expect(result.filePath).toBe('src/App.tsx');

      // Check static imports
      expect(result.imports).toEqual([
        expect.objectContaining({
          specifier: 'react',
          type: 'external',
        }),
        expect.objectContaining({
          specifier: './components/Header',
          resolvedPath: 'src/components/Header.tsx',
          type: 'internal',
        }),
        expect.objectContaining({
          specifier: './index.css',
          resolvedPath: 'src/index.css',
          type: 'internal',
        }),
        expect.objectContaining({
          specifier: './MissingModule',
          type: 'unresolved',
          diagnosticNote: expect.stringContaining('não localizado no workspace'),
        }),
      ]);

      // Dynamic imports must be in their own list
      expect(result.dynamicImports).toHaveLength(2);

      // 1. Static string inside dynamic import is resolved but marked as dynamic
      expect(result.dynamicImports[0]).toEqual(
        expect.objectContaining({
          specifier: './components/Sidebar',
          resolvedPath: 'src/components/Sidebar.tsx',
          type: 'internal',
          isDynamic: true,
        })
      );

      // 2. Runtime expression inside dynamic import is marked as unresolved
      expect(result.dynamicImports[1]).toEqual(
        expect.objectContaining({
          type: 'unresolved',
          isDynamic: true,
          diagnosticNote: expect.stringContaining('runtime'),
        })
      );
    });
  });

  describe('JSON imports and generated / ignored files resolution', () => {
    const jsonAndIgnoredOptions: PathResolutionOptions = {
      workspaceFiles: [
        'src/main.tsx',
        'src/App.tsx',
        'src/lib/i18n.ts',
        'src/i18n/pt.json',
        'src/i18n/en.json',
        'src/i18n/es.json',
        'src/data/config.json',
        'next-env.d.ts',
      ],
      knownExternalPackages: ['react'],
      paths: {
        '@/*': ['src/*'],
      },
    };

    it('1. resolves JSON imports via alias (@/i18n/pt.json -> src/i18n/pt.json)', () => {
      const res = resolveModuleSpecifier('@/i18n/pt.json', 'src/lib/i18n.ts', jsonAndIgnoredOptions);
      expect(res.type).toBe('internal');
      expect(res.resolvedPath).toBe('src/i18n/pt.json');
      expect(res.diagnosticNote).toBeUndefined();
    });

    it('2. resolves relative JSON imports (./config.json and ../i18n/en.json)', () => {
      const resRel = resolveModuleSpecifier('../i18n/en.json', 'src/lib/i18n.ts', jsonAndIgnoredOptions);
      expect(resRel.type).toBe('internal');
      expect(resRel.resolvedPath).toBe('src/i18n/en.json');

      const resSameDir = resolveModuleSpecifier('./config.json', 'src/data/index.ts', {
        ...jsonAndIgnoredOptions,
        workspaceFiles: [...jsonAndIgnoredOptions.workspaceFiles, 'src/data/index.ts'],
      });
      expect(resSameDir.type).toBe('internal');
      expect(resSameDir.resolvedPath).toBe('src/data/config.json');
    });

    it('3. flags truly missing JSON files as unresolved with clear diagnostic note', () => {
      const resMissingAlias = resolveModuleSpecifier('@/i18n/missing.json', 'src/lib/i18n.ts', jsonAndIgnoredOptions);
      expect(resMissingAlias.type).toBe('unresolved');
      expect(resMissingAlias.resolvedPath).toBeUndefined();
      expect(resMissingAlias.diagnosticNote).toContain('não localizado no workspace');

      const resMissingRel = resolveModuleSpecifier('./missing.json', 'src/lib/i18n.ts', jsonAndIgnoredOptions);
      expect(resMissingRel.type).toBe('unresolved');
      expect(resMissingRel.resolvedPath).toBeUndefined();
      expect(resMissingRel.diagnosticNote).toContain('não localizado no workspace');
    });

    it('4. preserves warnings for genuinely unresolved internal code dependencies', () => {
      const resMissingCode = resolveModuleSpecifier('./nonExistentModule', 'src/lib/i18n.ts', jsonAndIgnoredOptions);
      expect(resMissingCode.type).toBe('unresolved');
      expect(resMissingCode.resolvedPath).toBeUndefined();
      expect(resMissingCode.diagnosticNote).toContain('não localizado no workspace');

      const resMissingAliasCode = resolveModuleSpecifier('@/components/MissingHeader', 'src/App.tsx', jsonAndIgnoredOptions);
      expect(resMissingAliasCode.type).toBe('unresolved');
      expect(resMissingAliasCode.diagnosticNote).toContain('não localizado no workspace');
    });

    it('5. classifies references to files inside ignored or generated directories as "ignored" instead of unresolved error', () => {
      // Next.js generated route types in next-env.d.ts
      const resNextGenerated = resolveModuleSpecifier('./.next/types/routes.d.ts', 'next-env.d.ts', jsonAndIgnoredOptions);
      expect(resNextGenerated.type).toBe('ignored');
      expect(resNextGenerated.resolvedPath).toBe('.next/types/routes.d.ts');
      expect(resNextGenerated.diagnosticNote).toContain('Módulo em diretório gerado ou ignorado intencionalmente');

      // dist build outputs
      const resDist = resolveModuleSpecifier('../dist/bundle.js', 'src/App.tsx', jsonAndIgnoredOptions);
      expect(resDist.type).toBe('ignored');
      expect(resDist.resolvedPath).toBe('dist/bundle.js');

      // build folder
      const resBuild = resolveModuleSpecifier('./build/types.d.ts', 'src/App.tsx', jsonAndIgnoredOptions);
      expect(resBuild.type).toBe('ignored');
      expect(resBuild.resolvedPath).toBe('src/build/types.d.ts');
    });

    it('6. ensures valid imports are never mistakenly classified as generated or ignored', () => {
      const resValid = resolveModuleSpecifier('@/App', 'src/main.tsx', jsonAndIgnoredOptions);
      expect(resValid.type).toBe('internal');
      expect(resValid.resolvedPath).toBe('src/App.tsx');
      expect(resValid.type).not.toBe('ignored');

      const resExt = resolveModuleSpecifier('react', 'src/App.tsx', jsonAndIgnoredOptions);
      expect(resExt.type).toBe('external');
      expect(resExt.type).not.toBe('ignored');
    });

    it('7. ensures zero regressions in existing alias and relative path resolution', () => {
      const resAlias = resolveModuleSpecifier('@/main', 'src/lib/i18n.ts', jsonAndIgnoredOptions);
      expect(resAlias.type).toBe('internal');
      expect(resAlias.resolvedPath).toBe('src/main.tsx');
    });
  });
});

