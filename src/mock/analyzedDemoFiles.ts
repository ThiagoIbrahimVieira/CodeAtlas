import type { SourceFileInput } from '../analyzer/buildGraph';

/**
 * Realistic in-memory TypeScript workspace for end-to-end analyzer integration testing.
 *
 * Requirements covered:
 * 1. File importing two modules (src/index.ts -> userService, config)
 * 2. Two files sharing a dependency (userService & authService -> logger)
 * 3. Import cycle (userService <-> authService)
 * 4. Unresolved reference (Dashboard.tsx -> ./MissingReport)
 * 5. Dynamic import (authService -> ./utils/crypto)
 * 6. Isolated file without dependencies (standaloneHelper.ts)
 */
export const analyzedDemoFiles: SourceFileInput[] = [
  {
    path: 'src/index.ts',
    content: `
      import { getUserProfile } from './services/userService';
      import { AppConfig } from './config';

      export function initApp() {
        console.log('App starting with config', AppConfig);
        return getUserProfile('admin');
      }
    `,
  },
  {
    path: 'src/services/userService.ts',
    content: `
      import { logMessage } from '../utils/logger';
      import { checkUserSession } from './authService';

      export function getUserProfile(userId: string) {
        logMessage('Fetching user profile for ' + userId);
        const isValid = checkUserSession(userId);
        return { userId, active: isValid };
      }

      export function getUserPermissions(userId: string) {
        return userId === 'admin' ? ['read', 'write'] : ['read'];
      }
    `,
  },
  {
    path: 'src/services/authService.ts',
    content: `
      import { logMessage } from '../utils/logger';
      import { getUserPermissions } from './userService';

      export function checkUserSession(userId: string): boolean {
        logMessage('Checking session for ' + userId);
        const perms = getUserPermissions(userId);
        return perms.length > 0;
      }

      export async function authenticateWithCrypto(payload: string) {
        const cryptoModule = await import('../utils/crypto');
        return cryptoModule.hashData(payload);
      }
    `,
  },
  {
    path: 'src/components/Dashboard.tsx',
    content: `
      import React from 'react';
      import { AppConfig } from '../config';
      import { MissingReport } from './MissingReport';

      export const Dashboard = () => {
        return (
          <div>
            <h1>Dashboard: {AppConfig.version}</h1>
            <MissingReport />
          </div>
        );
      };
    `,
  },
  {
    path: 'src/utils/logger.ts',
    content: `
      export function logMessage(msg: string): void {
        console.log('[LOG]: ' + msg);
      }
    `,
  },
  {
    path: 'src/utils/crypto.ts',
    content: `
      export function hashData(input: string): string {
        return 'sha256:' + input.length;
      }
    `,
  },
  {
    path: 'src/config.ts',
    content: `
      export const AppConfig = {
        name: 'Analyzed Demo Workspace',
        version: '1.0.0',
        environment: 'production',
      };
    `,
  },
  {
    path: 'src/standaloneHelper.ts',
    content: `
      export const MATH_CONSTANT = 42;
      export function formatStandalone(num: number): string {
        return 'ID-' + num;
      }
    `,
  },
];
