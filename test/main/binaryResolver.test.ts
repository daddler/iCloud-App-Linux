import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let appRoot: string;

vi.mock('electron', () => ({
  app: {
    getAppPath: () => appRoot,
  },
}));

describe('resolveRcloneBinaryPath', () => {
  const originalArch = process.arch;

  beforeEach(() => {
    appRoot = mkdtempSync(join(tmpdir(), 'binary-resolver-test-'));
  });

  afterEach(() => {
    rmSync(appRoot, { recursive: true, force: true });
    Object.defineProperty(process, 'arch', { value: originalArch });
  });

  it('finds the bundled binary under resources/rclone/<arch>/rclone relative to the app path', async () => {
    Object.defineProperty(process, 'arch', { value: 'x64' });
    const binDir = join(appRoot, 'resources', 'rclone', 'x86_64');
    mkdirSync(binDir, { recursive: true });
    writeFileSync(join(binDir, 'rclone'), '#!/bin/sh\necho stub');

    const { resolveRcloneBinaryPath } = await import('../../electron/main/rclone/binaryResolver');
    expect(resolveRcloneBinaryPath()).toBe(join(binDir, 'rclone'));
  });

  it('throws a descriptive error for an unsupported architecture', async () => {
    Object.defineProperty(process, 'arch', { value: 'ia32' });
    const { resolveRcloneBinaryPath } = await import('../../electron/main/rclone/binaryResolver');
    expect(() => resolveRcloneBinaryPath()).toThrow(/Unsupported architecture/);
  });

  it('throws when no binary has been fetched yet', async () => {
    Object.defineProperty(process, 'arch', { value: 'arm64' });
    const { resolveRcloneBinaryPath } = await import('../../electron/main/rclone/binaryResolver');
    expect(() => resolveRcloneBinaryPath()).toThrow(/Bundled rclone binary not found/);
  });
});
