import { describe, expect, it } from 'vitest';
import { buildAtlasGraph } from './buildGraph';
import { analyzedDemoFiles } from '../mock/analyzedDemoFiles';

describe('End-to-End Analyzer Integration with Demo Files', () => {
  it('generates a fully valid AtlasProject matching the exact architectural topology', () => {
    const project = buildAtlasGraph(analyzedDemoFiles, {
      projectName: 'Analyzed Demo Workspace',
      projectDescription: 'Workspace real analisado via buildAtlasGraph().',
    });

    expect(project.name).toBe('Analyzed Demo Workspace');

    // 1. Total files: exactly 8 files without duplicates
    expect(project.files).toHaveLength(8);
    const fileIds = project.files.map((f) => f.id);
    expect(new Set(fileIds).size).toBe(8);

    // 2. File importing two modules (src/index.ts -> userService, config)
    const indexFile = project.files.find((f) => f.id === 'src/index.ts');
    expect(indexFile).toBeDefined();
    expect(indexFile?.imports.filter((i) => i.type === 'internal')).toHaveLength(2);
    expect(project.edges).toContainEqual({
      id: 'e-src/index.ts->src/services/userService.ts',
      source: 'src/index.ts',
      target: 'src/services/userService.ts',
    });
    expect(project.edges).toContainEqual({
      id: 'e-src/index.ts->src/config.ts',
      source: 'src/index.ts',
      target: 'src/config.ts',
    });

    // 3. Two files sharing a dependency (userService.ts & authService.ts -> logger.ts)
    expect(project.edges).toContainEqual({
      id: 'e-src/services/userService.ts->src/utils/logger.ts',
      source: 'src/services/userService.ts',
      target: 'src/utils/logger.ts',
    });
    expect(project.edges).toContainEqual({
      id: 'e-src/services/authService.ts->src/utils/logger.ts',
      source: 'src/services/authService.ts',
      target: 'src/utils/logger.ts',
    });

    // 4. Import cycle (userService.ts <-> authService.ts)
    expect(project.edges).toContainEqual({
      id: 'e-src/services/userService.ts->src/services/authService.ts',
      source: 'src/services/userService.ts',
      target: 'src/services/authService.ts',
    });
    expect(project.edges).toContainEqual({
      id: 'e-src/services/authService.ts->src/services/userService.ts',
      source: 'src/services/authService.ts',
      target: 'src/services/userService.ts',
    });

    // 5. Unresolved reference (Dashboard.tsx -> ./MissingReport)
    const dashboardFile = project.files.find((f) => f.id === 'src/components/Dashboard.tsx');
    expect(dashboardFile).toBeDefined();
    const missingImp = dashboardFile?.imports.find((i) => i.specifier === './MissingReport');
    expect(missingImp).toBeDefined();
    expect(missingImp?.type).toBe('unresolved');
    expect(missingImp?.resolvedPath).toBeUndefined();
    expect(missingImp?.diagnosticNote).toContain('não localizado no workspace');

    // Dashboard -> config.ts is resolved
    expect(project.edges).toContainEqual({
      id: 'e-src/components/Dashboard.tsx->src/config.ts',
      source: 'src/components/Dashboard.tsx',
      target: 'src/config.ts',
    });

    // 6. Dynamic import (authService.ts -> crypto.ts)
    const authFile = project.files.find((f) => f.id === 'src/services/authService.ts');
    expect(authFile?.dynamicImports).toHaveLength(1);
    expect(authFile?.dynamicImports?.[0].specifier).toBe('../utils/crypto');
    expect(authFile?.dynamicImports?.[0].resolvedPath).toBe('src/utils/crypto.ts');
    expect(authFile?.dynamicImports?.[0].isDynamic).toBe(true);

    // Dynamic import is NOT an edge in the static graph
    const cryptoEdge = project.edges.find((e) => e.target === 'src/utils/crypto.ts');
    expect(cryptoEdge).toBeUndefined();

    // 7. Isolated file without dependencies
    const standaloneFile = project.files.find((f) => f.id === 'src/standaloneHelper.ts');
    expect(standaloneFile).toBeDefined();
    expect(standaloneFile?.imports).toHaveLength(0);
    expect(standaloneFile?.exports).toContain('MATH_CONSTANT');
    expect(standaloneFile?.exports).toContain('formatStandalone');

    const standaloneAsSource = project.edges.find((e) => e.source === 'src/standaloneHelper.ts');
    const standaloneAsTarget = project.edges.find((e) => e.target === 'src/standaloneHelper.ts');
    expect(standaloneAsSource).toBeUndefined();
    expect(standaloneAsTarget).toBeUndefined();
  });
});
