import { describe, expect, it } from 'vitest';
import {
  filterAndNormalizeFiles,
  parsePackageJsonDependencies,
  parseTsConfigOptions,
  loadLocalProjectFromMemory,
  type VirtualLocalFile,
} from './localProjectLoader';

describe('localProjectLoader', () => {
  describe('filterAndNormalizeFiles', () => {
    it('normalizes paths by stripping the root folder and keeps supported code files', () => {
      const files: VirtualLocalFile[] = [
        { relativePath: 'my-project/src/main.tsx', content: 'console.log(1);' },
        { relativePath: 'my-project/src/App.tsx', content: 'export const App = 1;' },
        { relativePath: 'my-project/src/utils/helpers.ts', content: 'export const a = 2;' },
        { relativePath: 'my-project/src/legacy.js', content: 'var b = 3;' },
        { relativePath: 'my-project/src/types.d.ts', content: 'export type X = string;' },
        { relativePath: 'my-project/src/styles.css', content: 'body {}' },
      ];

      const { sourceFiles, ignoredCount } = filterAndNormalizeFiles(files);

      expect(ignoredCount).toBe(0);
      expect(sourceFiles.map((f) => f.path)).toEqual([
        'src/main.tsx',
        'src/App.tsx',
        'src/utils/helpers.ts',
        'src/legacy.js',
        'src/types.d.ts',
        'src/styles.css',
      ]);
    });

    it('ignores node_modules, .git, dist, build, and non-code assets securely', () => {
      const files: VirtualLocalFile[] = [
        { relativePath: 'my-project/src/index.ts', content: 'export const x = 1;' },
        { relativePath: 'my-project/node_modules/react/index.js', content: 'module.exports = {};' },
        { relativePath: 'my-project/.git/HEAD', content: 'ref: refs/heads/main' },
        { relativePath: 'my-project/dist/bundle.js', content: 'bundled' },
        { relativePath: 'my-project/build/output.js', content: 'built' },
        { relativePath: 'my-project/public/logo.png', content: 'binary' },
        { relativePath: 'my-project/video.mp4', content: 'video' },
      ];

      const { sourceFiles, ignoredCount } = filterAndNormalizeFiles(files);

      expect(sourceFiles).toHaveLength(1);
      expect(sourceFiles[0].path).toBe('src/index.ts');
      expect(ignoredCount).toBe(6);
    });
  });

  describe('parsePackageJsonDependencies', () => {
    it('extracts known external packages from dependencies and devDependencies', () => {
      const pkgContent = JSON.stringify({
        name: 'test-app',
        dependencies: {
          react: '^19.0.0',
          '@xyflow/react': '^12.0.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          vite: '^6.0.0',
        },
      });

      const packages = parsePackageJsonDependencies(pkgContent);
      expect(packages).toContain('react');
      expect(packages).toContain('@xyflow/react');
      expect(packages).toContain('typescript');
      expect(packages).toContain('vite');
    });

    it('returns empty array when package.json is invalid or empty', () => {
      expect(parsePackageJsonDependencies('{ broken json')).toEqual([]);
      expect(parsePackageJsonDependencies('')).toEqual([]);
    });
  });

  describe('parseTsConfigOptions', () => {
    it('extracts baseUrl and path mappings from tsconfig.json content', () => {
      const tsconfigContent = JSON.stringify({
        compilerOptions: {
          baseUrl: './src',
          paths: {
            '@/*': ['*'],
            '~/*': ['./*'],
          },
        },
      });

      const options = parseTsConfigOptions(tsconfigContent);
      expect(options.baseUrl).toBe('src');
      expect(options.paths).toEqual({
        '@/*': ['*'],
        '~/*': ['./*'],
      });
    });

    it('tolerates comments and trailing commas gracefully', () => {
      const tsconfigWithComments = `
        {
          // Compiler settings
          "compilerOptions": {
            "baseUrl": "src",
            "paths": {
              "@components/*": ["components/*"],
            },
          }
        }
      `;

      const options = parseTsConfigOptions(tsconfigWithComments);
      expect(options.baseUrl).toBe('src');
      expect(options.paths).toEqual({
        '@components/*': ['components/*'],
      });
    });

    it('preserves glob strings and alias patterns containing /* and // without truncating them', () => {
      const nextTsconfig = `{
        "compilerOptions": {
          "paths": {
            "@/*": ["./src/*"]
          }
        },
        "include": ["**/*.ts", "**/*.tsx"]
      }`;

      const options = parseTsConfigOptions(nextTsconfig);
      expect(options.paths).toEqual({
        '@/*': ['./src/*'],
      });
    });
  });

  describe('loadLocalProjectFromMemory', () => {
    it('builds a full AtlasProject from raw files using the analyzer pipeline', async () => {
      const files: VirtualLocalFile[] = [
        {
          relativePath: 'my-app/package.json',
          content: JSON.stringify({ dependencies: { react: '^19.0.0' } }),
        },
        {
          relativePath: 'my-app/src/index.ts',
          content: `
            import React from 'react';
            import { Header } from './Header';
            console.log(React, Header);
          `,
        },
        {
          relativePath: 'my-app/src/Header.tsx',
          content: `
            import { Missing } from './Missing';
            export const Header = () => null;
          `,
        },
      ];

      const result = await loadLocalProjectFromMemory(files, 'my-app');

      expect(result.project.name).toBe('my-app');
      expect(result.project.files).toHaveLength(2); // src/index.ts and src/Header.tsx
      expect(result.project.edges).toContainEqual({
        id: 'e-src/index.ts->src/Header.tsx',
        source: 'src/index.ts',
        target: 'src/Header.tsx',
      });

      const headerFile = result.project.files.find((f) => f.id === 'src/Header.tsx');
      expect(headerFile?.imports.some((i) => i.type === 'unresolved')).toBe(true);
    });

    it('resolves aliases configured in jsconfig.json for JavaScript projects', async () => {
      const files: VirtualLocalFile[] = [
        {
          relativePath: 'js-project/jsconfig.json',
          content: JSON.stringify({
            compilerOptions: {
              paths: {
                '@/*': ['./src/*'],
              },
            },
          }),
        },
        {
          relativePath: 'js-project/src/index.js',
          content: `import { helper } from '@/utils/helper';`,
        },
        {
          relativePath: 'js-project/src/utils/helper.js',
          content: `export const helper = () => 'ok';`,
        },
      ];

      const result = await loadLocalProjectFromMemory(files, 'js-project');
      expect(result.project.files).toHaveLength(2);
      expect(result.project.edges).toContainEqual({
        id: 'e-src/index.js->src/utils/helper.js',
        source: 'src/index.js',
        target: 'src/utils/helper.js',
      });
    });

    it('resolves aliases for a nested Next.js project selected from its parent folder', async () => {
      const files: VirtualLocalFile[] = [
        {
          relativePath: 'Tatto/nordicos-tattoo/package.json',
          content: JSON.stringify({ dependencies: { next: '16.2.11' } }),
        },
        {
          relativePath: 'Tatto/nordicos-tattoo/tsconfig.json',
          content: JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
        },
        {
          relativePath: 'Tatto/nordicos-tattoo/src/app/page.tsx',
          content: `import { cn } from '@/lib/utils'; import Header from '@/components/Header';`,
        },
        {
          relativePath: 'Tatto/nordicos-tattoo/src/lib/utils.ts',
          content: `export const cn = () => '';`,
        },
        {
          relativePath: 'Tatto/nordicos-tattoo/src/components/Header.tsx',
          content: `export default function Header() { return null; }`,
        },
      ];

      const result = await loadLocalProjectFromMemory(files, 'nordicos-tattoo');
      const page = result.project.files.find((file) => file.id === 'src/app/page.tsx');

      expect(page?.imports.every((entry) => entry.type === 'internal')).toBe(true);
      expect(result.project.edges).toContainEqual({
        id: 'e-src/app/page.tsx->src/lib/utils.ts',
        source: 'src/app/page.tsx',
        target: 'src/lib/utils.ts',
      });
      expect(result.project.edges).toContainEqual({
        id: 'e-src/app/page.tsx->src/components/Header.tsx',
        source: 'src/app/page.tsx',
        target: 'src/components/Header.tsx',
      });
      expect(result.project.edges.filter((edge) => edge.target === 'src/lib/utils.ts')).toHaveLength(1);
    });

    it('resolves @ aliases mapped to the repository root', async () => {
      const files: VirtualLocalFile[] = [
        {
          relativePath: 'root-alias/tsconfig.json',
          content: JSON.stringify({ compilerOptions: { paths: { '@/*': ['./*'] } } }),
        },
        {
          relativePath: 'root-alias/app/page.tsx',
          content: `import { siteName } from '@/lib/site';`,
        },
        {
          relativePath: 'root-alias/lib/site.ts',
          content: `export const siteName = 'CodeAtlas';`,
        },
      ];

      const result = await loadLocalProjectFromMemory(files, 'root-alias');

      expect(result.project.edges).toContainEqual({
        id: 'e-app/page.tsx->lib/site.ts',
        source: 'app/page.tsx',
        target: 'lib/site.ts',
      });
    });

    it('resolves aliases inherited via "extends" chain', async () => {
      const files: VirtualLocalFile[] = [
        {
          relativePath: 'monorepo/tsconfig.base.json',
          content: JSON.stringify({
            compilerOptions: {
              paths: {
                '@core/*': ['./src/core/*'],
              },
            },
          }),
        },
        {
          relativePath: 'monorepo/tsconfig.json',
          content: JSON.stringify({
            extends: './tsconfig.base.json',
            compilerOptions: {
              target: 'ES2022',
            },
          }),
        },
        {
          relativePath: 'monorepo/src/index.ts',
          content: `import { logger } from '@core/logger';`,
        },
        {
          relativePath: 'monorepo/src/core/logger.ts',
          content: `export const logger = 1;`,
        },
      ];

      const result = await loadLocalProjectFromMemory(files, 'monorepo');
      expect(result.project.edges).toContainEqual({
        id: 'e-src/index.ts->src/core/logger.ts',
        source: 'src/index.ts',
        target: 'src/core/logger.ts',
      });
    });

    it('resolves @/* aliases to src/* in Next.js project with tsconfig comments and glob includes', async () => {
      const nextFiles: VirtualLocalFile[] = [
        {
          relativePath: 'my-next-app/package.json',
          content: JSON.stringify({
            name: 'my-next-app',
            dependencies: {
              next: '15.0.0',
              react: '19.0.0',
              'lucide-react': '^1.0.0',
              'framer-motion': '^11.0.0',
            },
          }),
        },
        {
          relativePath: 'my-next-app/tsconfig.json',
          content: `{
            "compilerOptions": {
              "target": "ES2017",
              "lib": ["dom", "dom.iterable", "esnext"],
              "allowJs": true,
              "skipLibCheck": true,
              "strict": true,
              "noEmit": true,
              "esModuleInterop": true,
              "module": "esnext",
              "moduleResolution": "bundler",
              "resolveJsonModule": true,
              "isolatedModules": true,
              "jsx": "react-jsx",
              "incremental": true,
              "plugins": [{ "name": "next" }],
              "paths": {
                "@/*": ["./src/*"]
              }
            },
            "include": [
              "next-env.d.ts",
              "**/*.ts",
              "**/*.tsx",
              ".next/types/**/*.ts",
              ".next/dev/types/**/*.ts",
              "**/*.mts"
            ],
            "exclude": ["node_modules"]
          }`,
        },
        {
          relativePath: 'my-next-app/src/components/Navbar.tsx',
          content: `
            'use client';
            import { useState, useEffect } from 'react';
            import { Menu, X, Globe } from 'lucide-react';
            import { motion, AnimatePresence } from 'framer-motion';
            import { useLanguage } from '@/lib/LanguageContext';
            import { locales, localeNames, localeFlags, Locale } from '@/lib/i18n';
            import { cn } from '@/lib/utils';
            import useActiveSection from '@/hooks/useActiveSection';
          `,
        },
        {
          relativePath: 'my-next-app/src/lib/LanguageContext.tsx',
          content: `export const useLanguage = () => ({ locale: 'pt' });`,
        },
        {
          relativePath: 'my-next-app/src/lib/i18n.ts',
          content: `export const locales = ['pt', 'en']; export const localeNames = {}; export const localeFlags = {}; export type Locale = string;`,
        },
        {
          relativePath: 'my-next-app/src/lib/utils.ts',
          content: `export function cn(...inputs: any[]) { return ''; }`,
        },
        {
          relativePath: 'my-next-app/src/hooks/useActiveSection.ts',
          content: `export default function useActiveSection() { return 'home'; }`,
        },
      ];

      const result = await loadLocalProjectFromMemory(nextFiles, 'my-next-app');
      const navbar = result.project.files.find((f) => f.id === 'src/components/Navbar.tsx');
      expect(navbar).toBeDefined();

      // 7 total imports: 3 external, 4 internal (all resolved)
      expect(navbar?.imports).toHaveLength(7);
      const internalImports = navbar?.imports.filter((i) => i.type === 'internal') ?? [];
      const externalImports = navbar?.imports.filter((i) => i.type === 'external') ?? [];
      const unresolvedImports = navbar?.imports.filter((i) => i.type === 'unresolved') ?? [];

      expect(externalImports).toHaveLength(3);
      expect(internalImports).toHaveLength(4);
      expect(unresolvedImports).toHaveLength(0);

      // Outgoing edges from Navbar to the 4 internal modules
      const navbarEdges = result.project.edges.filter((e) => e.source === 'src/components/Navbar.tsx');
      expect(navbarEdges).toHaveLength(4);
      expect(navbarEdges.map((e) => e.target)).toEqual([
        'src/lib/LanguageContext.tsx',
        'src/lib/i18n.ts',
        'src/lib/utils.ts',
        'src/hooks/useActiveSection.ts',
      ]);
    });

    it('throws a descriptive error when no supported source files are provided', async () => {
      const emptyFiles: VirtualLocalFile[] = [
        { relativePath: 'repo/.git/config', content: 'git' },
        { relativePath: 'repo/image.png', content: 'png' },
      ];

      await expect(loadLocalProjectFromMemory(emptyFiles, 'empty-repo')).rejects.toThrow(
        /Nenhum arquivo JavaScript ou TypeScript suportado/
      );
    });

    it('correctly resolves JSON data modules and classifies .next generated types without false alarms', async () => {
      const files: VirtualLocalFile[] = [
        {
          relativePath: 'portfolio/package.json',
          content: JSON.stringify({
            name: 'portfolio',
            dependencies: { react: '^19.0.0' },
          }),
        },
        {
          relativePath: 'portfolio/tsconfig.json',
          content: JSON.stringify({
            compilerOptions: {
              baseUrl: '.',
              paths: {
                '@/*': ['./src/*'],
              },
            },
          }),
        },
        {
          relativePath: 'portfolio/next-env.d.ts',
          content: `
            /// <reference types="next" />
            import "./.next/types/routes.d.ts";
          `,
        },
        {
          relativePath: 'portfolio/src/lib/i18n.ts',
          content: `
            import pt from '@/i18n/pt.json';
            import en from '@/i18n/en.json';
            import es from '@/i18n/es.json';
            import broken from './missingModule';

            export const dictionaries = { pt, en, es };
          `,
        },
        {
          relativePath: 'portfolio/src/i18n/pt.json',
          content: JSON.stringify({ nav: { home: 'Início' } }),
        },
        {
          relativePath: 'portfolio/src/i18n/en.json',
          content: JSON.stringify({ nav: { home: 'Home' } }),
        },
        {
          relativePath: 'portfolio/src/i18n/es.json',
          content: JSON.stringify({ nav: { home: 'Inicio' } }),
        },
      ];

      const result = await loadLocalProjectFromMemory(files, 'portfolio');

      // 1. Files in project: next-env.d.ts, src/lib/i18n.ts, and 3 json files (5 files total; config files excluded)
      expect(result.project.files.map((f) => f.id).sort()).toEqual([
        'next-env.d.ts',
        'src/i18n/en.json',
        'src/i18n/es.json',
        'src/i18n/pt.json',
        'src/lib/i18n.ts',
      ]);

      // 2. JSON files are purely data nodes (no AST parsing, no imports/exports)
      const ptJson = result.project.files.find((f) => f.id === 'src/i18n/pt.json');
      expect(ptJson).toBeDefined();
      expect(ptJson?.imports).toHaveLength(0);
      expect(ptJson?.exports).toHaveLength(0);

      // 3. src/lib/i18n.ts resolves all 3 JSON modules via alias, and keeps real broken import unresolved
      const i18n = result.project.files.find((f) => f.id === 'src/lib/i18n.ts');
      expect(i18n).toBeDefined();

      const internalImports = i18n?.imports.filter((i) => i.type === 'internal') ?? [];
      const unresolvedImports = i18n?.imports.filter((i) => i.type === 'unresolved') ?? [];
      const ignoredImports = i18n?.imports.filter((i) => i.type === 'ignored') ?? [];

      expect(internalImports).toHaveLength(3);
      expect(internalImports.map((i) => i.resolvedPath)).toEqual([
        'src/i18n/pt.json',
        'src/i18n/en.json',
        'src/i18n/es.json',
      ]);

      // Legitimate broken import is preserved with clear error
      expect(unresolvedImports).toHaveLength(1);
      expect(unresolvedImports[0].specifier).toBe('./missingModule');
      expect(unresolvedImports[0].diagnosticNote).toContain('não localizado no workspace');

      expect(ignoredImports).toHaveLength(0);

      // 4. Edges created to JSON data files
      const i18nEdges = result.project.edges.filter((e) => e.source === 'src/lib/i18n.ts');
      expect(i18nEdges).toContainEqual({
        id: 'e-src/lib/i18n.ts->src/i18n/pt.json',
        source: 'src/lib/i18n.ts',
        target: 'src/i18n/pt.json',
      });
      expect(i18nEdges).toContainEqual({
        id: 'e-src/lib/i18n.ts->src/i18n/en.json',
        source: 'src/lib/i18n.ts',
        target: 'src/i18n/en.json',
      });
      expect(i18nEdges).toContainEqual({
        id: 'e-src/lib/i18n.ts->src/i18n/es.json',
        source: 'src/lib/i18n.ts',
        target: 'src/i18n/es.json',
      });

      // 5. next-env.d.ts classifies ./.next/types/routes.d.ts as ignored (NOT unresolved error)
      const nextEnv = result.project.files.find((f) => f.id === 'next-env.d.ts');
      expect(nextEnv).toBeDefined();
      const nextEnvIgnored = nextEnv?.imports.filter((i) => i.type === 'ignored') ?? [];
      const nextEnvUnresolved = nextEnv?.imports.filter((i) => i.type === 'unresolved') ?? [];

      expect(nextEnvIgnored).toHaveLength(1);
      expect(nextEnvIgnored[0].specifier).toBe('./.next/types/routes.d.ts');
      expect(nextEnvIgnored[0].diagnosticNote).toContain('Módulo em diretório gerado ou ignorado');
      expect(nextEnvUnresolved).toHaveLength(0);
    });
  });
});
