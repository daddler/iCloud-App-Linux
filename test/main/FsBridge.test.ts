import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FsBridge } from '../../electron/main/fs/FsBridge';

describe('FsBridge', () => {
  let root: string;
  let bridge: FsBridge;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fsbridge-test-'));
    mkdirSync(join(root, 'Documents'));
    writeFileSync(join(root, 'Documents', 'note.txt'), 'hello');
    bridge = new FsBridge(root);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('lists directory contents relative to the mount root', async () => {
    const entries = await bridge.readdir('/');
    expect(entries).toEqual([
      expect.objectContaining({ name: 'Documents', kind: 'directory' }),
    ]);
  });

  it('resolves nested paths within the mount root', async () => {
    const entries = await bridge.readdir('/Documents');
    expect(entries).toEqual([
      expect.objectContaining({ name: 'note.txt', kind: 'file', size: 5 }),
    ]);
  });

  it('rejects paths that attempt to escape the mount root via ..', async () => {
    await expect(bridge.readdir('../../etc')).rejects.toThrow(/escapes mount root/);
  });

  it('rejects escaping paths even when smuggled inside a deeper relative path', async () => {
    await expect(bridge.readdir('/Documents/../../../etc')).rejects.toThrow(/escapes mount root/);
  });

  it('resolves an absolute on-disk path for a valid relative path', () => {
    const abs = bridge.toAbsolutePath('/Documents/note.txt');
    expect(abs).toBe(join(root, 'Documents', 'note.txt'));
  });

  it('throws when resolving an absolute path for an escaping relative path', () => {
    expect(() => bridge.toAbsolutePath('../outside.txt')).toThrow(/escapes mount root/);
  });
});
