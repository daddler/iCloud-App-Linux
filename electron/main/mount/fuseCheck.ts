import { access, constants } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface FuseAvailability {
  available: boolean;
  reason?: string;
}

/**
 * Checks whether FUSE is usable on this host before attempting `rclone mount`.
 * AppImages can bundle the rclone binary, but not a kernel-level FUSE module —
 * this must exist on the host system already.
 */
export async function checkFuseAvailability(): Promise<FuseAvailability> {
  const hasFusermount = await commandExists('fusermount3').then(
    (ok) => ok || commandExists('fusermount'),
  );
  if (!hasFusermount) {
    return {
      available: false,
      reason:
        'Neither "fusermount3" nor "fusermount" was found on PATH. Install fuse3 ' +
        '(e.g. "sudo apt install fuse3", "sudo dnf install fuse3", "sudo pacman -S fuse3").',
    };
  }

  try {
    await access('/dev/fuse', constants.R_OK | constants.W_OK);
  } catch {
    return {
      available: false,
      reason:
        '/dev/fuse is missing or not accessible. Make sure the fuse kernel module is ' +
        'loaded ("sudo modprobe fuse") and that your user has permission to use it.',
    };
  }

  return { available: true };
}

async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execFileAsync('which', [cmd]);
    return true;
  } catch {
    return false;
  }
}
