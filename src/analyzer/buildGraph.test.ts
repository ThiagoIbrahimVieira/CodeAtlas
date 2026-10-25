import { describe, expect, it } from 'vitest';
import { buildAtlasGraph, inferFileType, type SourceFileInput } from './buildGraph';

describe('buildAtlasGraph', () => {
  it('builds a complete graph with multiple files, shared dependencies and correct edges', () => {
    const files: SourceFileInput[] = [
      {
        path: 'src/main.tsx',
        content: `
          import React from 'react';
          import { App } from './App';
          import './styles/global.css';
        `,
      },
      {
        path: 'src/App.tsx',
        content: `
          import React from 'react';
          import { Header } from './components/Header';
          import { Footer } from './components/Footer';
        `,
      },
      {
        path: 'src/components/Header.tsx',
        content: `
          import React from 'react';
          import { Button } from './common/Button';
        `,
      },
      {
        path: 'src/components/Footer.tsx',
        content: `
          import React from 'react';
          import { Button } from './common/Button';
        `,
      },
      {
        path: 'src/components/common/Button.tsx',
        content: `
          import React from 'react';
          export const Button = () => <button>Click</button>;
        `,
      },
      {
        path: 'src/styles/global.css',
        content: `body { margin: 0; }`,
      },
    ];

    const project = buildAtlasGraph(files, {
      projectName: 'Test App',
      projectDescription: 'Integration Test Graph',
    });

    expect(project.name).toBe('Test App');
    expect(project.description).toBe('Integration Test Graph');

    // 1. Check all nodes exist without duplicates
    const fileIds = project.files.map((f) => f.id);
    expect(fileIds).toHaveLength(6);
    expect(new Set(fileIds).size).toBe(6);
    expect(fileIds).toContain('src/main.tsx');
    expect(fileIds).toContain('src/App.tsx');
    expect(fileIds).toContain('src/components/Header.tsx');
    expect(fileIds).toContain('src/components/Footer.tsx');
    expect(fileIds).toContain('src/components/common/Button.tsx');
    expect(fileIds).toContain('src/styles/global.css');

    // 2. Check File Types
    const mainFile = project.files.find((f) => f.id === 'src/main.tsx');
    const headerFile = project.files.find((f) => f.id === 'src/components/Header.tsx');
    const cssFile = project.files.find((f) => f.id === 'src/styles/global.css');
    expect(mainFile?.type).toBe('entry');
    expect(headerFile?.type).toBe('component');
    expect(cssFile?.type).toBe('style');

    // 3. Check Shared Dependencies and Directed Edges
    // main -> App, main -> styles/global.css
    // App -> Header, App -> Footer
    // Header -> Button, Footer -> Button
    expect(project.edges).toContainEqual({
      id: 'e-src/main.tsx->src/App.tsx',
      source: 'src/main.tsx',
      target: 'src/App.tsx',
    });
    expect(project.edges).toContainEqual({
      id: 'e-src/main.tsx->src/styles/global.css',
      source: 'src/main.tsx',
      target: 'src/styles/global.css',
    });
    expect(project.edges).toContainEqual({
      id: 'e-src/App.tsx->src/components/Header.tsx',
      source: 'src/App.tsx',
      target: 'src/components/Header.tsx',
    });
    expect(project.edges).toContainEqual({
      id: 'e-src/App.tsx->src/components/Footer.tsx',
      source: 'src/App.tsx',
      target: 'src/components/Footer.tsx',
    });
    expect(project.edges).toContainEqual({
      id: 'e-src/components/Header.tsx->src/components/common/Button.tsx',
      source: 'src/components/Header.tsx',
      target: 'src/components/common/Button.tsx',
    });
    expect(project.edges).toContainEqual({
      id: 'e-src/components/Footer.tsx->src/components/common/Button.tsx',
      source: 'src/components/Footer.tsx',
      target: 'src/components/common/Button.tsx',
    });

    expect(project.edges).toHaveLength(6);
  });

  it('handles cyclic dependencies gracefully without infinite loops or edge duplication', () => {
    // Module A imports Module B, and Module B imports Module A
    const files: SourceFileInput[] = [
      {
        path: 'src/moduleA.ts',
        content: `
          import { b } from './moduleB';
          export const a = 1;
        `,
      },
      {
        path: 'src/moduleB.ts',
        content: `
          import { a } from './moduleA';
          export const b = 2;
        `,
      },
    ];

    const project = buildAtlasGraph(files);

    expect(project.files).toHaveLength(2);
    expect(project.edges).toHaveLength(2);
    expect(project.edges).toContainEqual({
      id: 'e-src/moduleA.ts->src/moduleB.ts',
      source: 'src/moduleA.ts',
      target: 'src/moduleB.ts',
    });
    expect(project.edges).toContainEqual({
      id: 'e-src/moduleB.ts->src/moduleA.ts',
      source: 'src/moduleB.ts',
      target: 'src/moduleA.ts',
    });
  });

  it('handles unresolved references as diagnostics without creating phantom nodes or edges', () => {
    const files: SourceFileInput[] = [
      {
        path: 'src/Service.ts',
        content: `
          import { Existing } from './Existing';
          import { Ghost } from './GhostModule';
        `,
      },
      {
        path: 'src/Existing.ts',
        content: `export const Existing = 'ok';`,
      },
    ];

    const project = buildAtlasGraph(files);

    expect(project.files).toHaveLength(2); // Only Service.ts and Existing.ts
    expect(project.edges).toHaveLength(1); // Only Service -> Existing
    expect(project.edges[0]).toEqual({
      id: 'e-src/Service.ts->src/Existing.ts',
      source: 'src/Service.ts',
      target: 'src/Existing.ts',
    });

    const serviceFile = project.files.find((f) => f.id === 'src/Service.ts');
    const ghostImport = serviceFile?.imports.find((i) => i.specifier === './GhostModule');

    expect(ghostImport?.type).toBe('unresolved');
    expect(ghostImport?.resolvedPath).toBeUndefined();
    expect(ghostImport?.diagnosticNote).toBeDefined();
  });

  it('preserves re-exports as graph edges with isReexport metadata', () => {
    const files: SourceFileInput[] = [
      {
        path: 'src/index.ts',
        content: `
          export { Button } from './Button';
          export * from './theme';
        `,
      },
      {
        path: 'src/Button.tsx',
        content: `export const Button = () => null;`,
      },
      {
        path: 'src/theme.ts',
        content: `export const theme = { dark: true };`,
      },
    ];

    const project = buildAtlasGraph(files);

    expect(project.edges).toContainEqual({
      id: 'e-src/index.ts->src/Button.tsx',
      source: 'src/index.ts',
      target: 'src/Button.tsx',
    });
    expect(project.edges).toContainEqual({
      id: 'e-src/index.ts->src/theme.ts',
      source: 'src/index.ts',
      target: 'src/theme.ts',
    });

    const indexFile = project.files.find((f) => f.id === 'src/index.ts');
    const reexportImport = indexFile?.imports.find((i) => i.specifier === './Button');
    expect(reexportImport?.isReexport).toBe(true);
  });

  it('handles isolated files without dependencies or dependents', () => {
    const files: SourceFileInput[] = [
      {
        path: 'src/standalone.ts',
        content: `
          export const PI = 3.14159;
          export function calculateArea(r: number) { return PI * r * r; }
        `,
      },
    ];

    const project = buildAtlasGraph(files);

    expect(project.files).toHaveLength(1);
    expect(project.files[0].imports).toHaveLength(0);
    expect(project.files[0].exports).toContain('PI');
    expect(project.files[0].exports).toContain('calculateArea');
    expect(project.edges).toHaveLength(0);
  });

  it('separates dynamic imports from static graph edges', () => {
    const files: SourceFileInput[] = [
      {
        path: 'src/LazyApp.tsx',
        content: `
          import React from 'react';
          const DynamicModal = React.lazy(() => import('./Modal'));
        `,
      },
      {
        path: 'src/Modal.tsx',
        content: `export const Modal = () => null;`,
      },
    ];

    const project = buildAtlasGraph(files);

    // Static edges do NOT include dynamic imports
    expect(project.edges).toHaveLength(0);

    const lazyApp = project.files.find((f) => f.id === 'src/LazyApp.tsx');
    expect(lazyApp?.dynamicImports).toHaveLength(1);
    expect(lazyApp?.dynamicImports?.[0].specifier).toBe('./Modal');
    expect(lazyApp?.dynamicImports?.[0].resolvedPath).toBe('src/Modal.tsx');
    expect(lazyApp?.dynamicImports?.[0].isDynamic).toBe(true);
  });

  describe('inferFileType', () => {
    it('infers file types based on naming and path conventions', () => {
      expect(inferFileType('src/main.tsx')).toBe('entry');
      expect(inferFileType('src/App.tsx')).toBe('entry');
      expect(inferFileType('src/components/Header.tsx')).toBe('component');
      expect(inferFileType('src/hooks/useTheme.ts')).toBe('hook');
      expect(inferFileType('src/useAuth.ts')).toBe('hook');
      expect(inferFileType('src/styles/theme.css')).toBe('style');
      expect(inferFileType('src/utils/formatters.ts')).toBe('util');
      expect(inferFileType('src/services/api.ts')).toBe('util');
    });
  });
});
