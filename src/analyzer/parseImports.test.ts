import { describe, expect, it } from 'vitest';
import { analyzeFileDependencies } from './parseImports';

describe('analyzeFileDependencies', () => {
  it('extracts named, default, and namespace imports correctly', () => {
    const code = `
      import React from 'react';
      import { useState, useEffect as useMount } from 'react';
      import * as Path from 'node:path';
    `;

    const result = analyzeFileDependencies('src/example.tsx', code);

    expect(result.filePath).toBe('src/example.tsx');
    expect(result.dynamicImports).toHaveLength(0);
    expect(result.staticImports).toEqual([
      {
        specifier: 'react',
        kind: 'default',
        isTypeOnly: false,
        isReexport: false,
        symbols: ['React'],
        sourceLine: 2,
      },
      {
        specifier: 'react',
        kind: 'named',
        isTypeOnly: false,
        isReexport: false,
        symbols: ['useState', 'useMount'],
        sourceLine: 3,
      },
      {
        specifier: 'node:path',
        kind: 'namespace',
        isTypeOnly: false,
        isReexport: false,
        symbols: ['Path'],
        sourceLine: 4,
      },
    ]);
  });

  it('extracts side-effect only imports', () => {
    const code = `
      import './styles/global.css';
      import 'reflect-metadata';
    `;

    const result = analyzeFileDependencies('src/index.ts', code);

    expect(result.staticImports).toEqual([
      {
        specifier: './styles/global.css',
        kind: 'side-effect',
        isTypeOnly: false,
        isReexport: false,
        symbols: [],
        sourceLine: 2,
      },
      {
        specifier: 'reflect-metadata',
        kind: 'side-effect',
        isTypeOnly: false,
        isReexport: false,
        symbols: [],
        sourceLine: 3,
      },
    ]);
  });

  it('extracts re-exports with origin in another module', () => {
    const code = `
      export { Button, Input as TextInput } from './components/Button';
      export * from './theme';
      export * as Icons from './icons';
      export type { ThemeConfig } from './themeTypes';
      // Local export should NOT be treated as module dependency:
      export const localConstant = 42;
      export function helper() {}
    `;

    const result = analyzeFileDependencies('src/index.ts', code);

    expect(result.staticImports).toEqual([
      {
        specifier: './components/Button',
        kind: 'reexport',
        isTypeOnly: false,
        isReexport: true,
        symbols: ['Button', 'TextInput'],
        sourceLine: 2,
      },
      {
        specifier: './theme',
        kind: 'reexport',
        isTypeOnly: false,
        isReexport: true,
        symbols: ['*'],
        sourceLine: 3,
      },
      {
        specifier: './icons',
        kind: 'reexport',
        isTypeOnly: false,
        isReexport: true,
        symbols: ['Icons'],
        sourceLine: 4,
      },
      {
        specifier: './themeTypes',
        kind: 'reexport',
        isTypeOnly: true,
        isReexport: true,
        symbols: ['ThemeConfig'],
        sourceLine: 5,
      },
    ]);
  });

  it('ignores comments and strings that contain import keywords', () => {
    const code = `
      // import fakeFromComment from './fakeComment';
      /*
        import multiLine from './multiLine';
        export * from './fakeExport';
      */
      const query = "import fakeFromString from './fakeString'";
      const template = \`export { something } from './fakeTemplate'\`;
      const description = 'Use import() for code splitting';
      import './realSideEffect';
    `;

    const result = analyzeFileDependencies('src/service.ts', code);

    expect(result.dynamicImports).toHaveLength(0);
    expect(result.staticImports).toEqual([
      {
        specifier: './realSideEffect',
        kind: 'side-effect',
        isTypeOnly: false,
        isReexport: false,
        symbols: [],
        sourceLine: 10,
      },
    ]);
  });

  it('extracts dynamic imports separately without treating them as resolved static dependencies', () => {
    const code = `
      import { lazy } from 'react';

      const HeavyComponent = lazy(() => import('./HeavyComponent'));
      const localizedModule = (lang: string) => import(\`./locales/\${lang}.json\`);
    `;

    const result = analyzeFileDependencies('src/App.tsx', code);

    // Static imports only contain 'react'
    expect(result.staticImports).toEqual([
      {
        specifier: 'react',
        kind: 'named',
        isTypeOnly: false,
        isReexport: false,
        symbols: ['lazy'],
        sourceLine: 2,
      },
    ]);

    // Dynamic imports are separated
    expect(result.dynamicImports).toEqual([
      {
        specifier: './HeavyComponent',
        isDynamicExpression: false,
        sourceLine: 4,
      },
      {
        specifier: undefined,
        isDynamicExpression: true,
        sourceLine: 5,
      },
    ]);
  });

  it('handles files with no imports or exports without errors', () => {
    const code = `
      const a = 1;
      const b = 2;
      function sum(x: number, y: number): number {
        return x + y;
      }
      console.log(sum(a, b));
    `;

    const result = analyzeFileDependencies('src/utils/math.ts', code);

    expect(result.filePath).toBe('src/utils/math.ts');
    expect(result.staticImports).toEqual([]);
    expect(result.dynamicImports).toEqual([]);
  });

  it('parses valid complex TypeScript syntax (generics, interfaces, decorators, enums)', () => {
    const code = `
      import type { ComponentProps } from 'react';
      import { BaseEntity } from '../core/Entity';

      export enum Status {
        Active = 'ACTIVE',
        Disabled = 'DISABLED',
      }

      export interface Repository<T extends BaseEntity> {
        findById(id: string): Promise<T | null>;
        save<U extends Partial<T>>(item: U): Promise<void>;
      }

      export class UserRepo implements Repository<BaseEntity> {
        async findById(id: string): Promise<BaseEntity | null> {
          if (!id) return null;
          return { id } as BaseEntity;
        }
        async save(): Promise<void> {}
      }
    `;

    const result = analyzeFileDependencies('src/repos/UserRepo.ts', code);

    expect(result.staticImports).toEqual([
      {
        specifier: 'react',
        kind: 'named',
        isTypeOnly: true,
        isReexport: false,
        symbols: ['ComponentProps'],
        sourceLine: 2,
      },
      {
        specifier: '../core/Entity',
        kind: 'named',
        isTypeOnly: false,
        isReexport: false,
        symbols: ['BaseEntity'],
        sourceLine: 3,
      },
    ]);
    expect(result.dynamicImports).toEqual([]);
  });

  it('handles combined default and named imports in a single declaration', () => {
    const code = `
      import React, { useState } from 'react';
    `;

    const result = analyzeFileDependencies('src/Combo.tsx', code);

    expect(result.staticImports).toEqual([
      {
        specifier: 'react',
        kind: 'named',
        isTypeOnly: false,
        isReexport: false,
        symbols: ['React', 'useState'],
        sourceLine: 2,
      },
    ]);
  });

  it('handles double-quoted static imports and non-interpolated backtick dynamic imports', () => {
    const code = `
      import "./double-quoted.css";
      const dyn = import(\`./staticDyn\`);
    `;

    const result = analyzeFileDependencies('src/Backticks.ts', code);

    expect(result.staticImports).toEqual([
      {
        specifier: './double-quoted.css',
        kind: 'side-effect',
        isTypeOnly: false,
        isReexport: false,
        symbols: [],
        sourceLine: 2,
      },
    ]);
    expect(result.dynamicImports).toEqual([
      {
        specifier: './staticDyn',
        isDynamicExpression: false,
        sourceLine: 3,
      },
    ]);
  });

  it('tolerates syntax errors without throwing exceptions', () => {
    const malformedCode = `
      import { broken, from 'unclosed-syntax'
      const unclosed = "something
      import './validAfterBroken';
    `;

    expect(() => {
      const result = analyzeFileDependencies('src/Broken.ts', malformedCode);
      expect(result.filePath).toBe('src/Broken.ts');
    }).not.toThrow();
  });
});
