import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { rmSync, existsSync } from 'node:fs';

/**
 * Compiles the library with webpack targeting 'web'.
 *
 * In webpack 5, target:'web' does NOT polyfill Node built-ins.
 * If any source file or dependency imports a Node module (buffer,
 * crypto, fs, vm, stream, …), the build fails — which is exactly
 * what we want to catch.
 */

const ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(ROOT, '.web-build-test');

describe('No Node.js polyfills required for web', () => {
  it('compiles with webpack target:web without errors', () => {
    // Clean previous output
    if (existsSync(OUTPUT_DIR)) rmSync(OUTPUT_DIR, { recursive: true });

    try {
      const output = execSync('npx webpack --config webpack.web-test.config.js 2>&1', {
        cwd: ROOT,
        encoding: 'utf-8',
      });

      // Webpack may "succeed" but emit warnings about missing modules.
      // Treat CriticalDependency / Module not found warnings as failures too.
      const hasPolyfillWarning = /Module not found/.test(output) || /Can't resolve/.test(output);

      expect(hasPolyfillWarning, `Webpack emitted polyfill warnings:\n${output}`).toBe(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? ((err as Error & { stdout?: string }).stdout ?? err.message)
          : String(err);
      expect.fail(`Webpack build failed — likely a Node.js dependency is required:\n${msg}`);
    } finally {
      // Clean up
      if (existsSync(OUTPUT_DIR)) rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
  }, 60_000);
});
