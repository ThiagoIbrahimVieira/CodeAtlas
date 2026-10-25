import { buildAtlasGraph } from '../analyzer/buildGraph';
import { analyzedDemoFiles } from './analyzedDemoFiles';

/**
 * Pre-analyzed real project generated dynamically from source files
 * using the CodeAtlas static analysis pipeline (Etapas 2.1 - 2.3).
 */
export const analyzedProject = buildAtlasGraph(analyzedDemoFiles, {
  projectName: 'Analyzed Demo Project',
  projectDescription: 'Projeto TypeScript analisado dinamicamente pelo analisador estático do CodeAtlas.',
});
