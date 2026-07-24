import { normalize, join, resolve, relative } from 'node:path';
import { protocol, net } from 'electron';
import { pathToFileURL } from 'node:url';

const SCHEME = 'icloud-media';

/**
 * Registers a privileged custom protocol used purely so the sandboxed
 * renderer can render <img>/<video> tags for files on the FUSE mounts
 * (e.g. Photos thumbnails) without needing direct filesystem/Node access.
 * URLs look like `icloud-media://drive/<relative-path>` or
 * `icloud-media://photos/<relative-path>`.
 */
export function registerMediaProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ]);
}

export function setupMediaProtocolHandler(roots: { drive: string; photos: string }): void {
  protocol.handle(SCHEME, (request) => {
    const url = new URL(request.url);
    const root = url.host === 'photos' ? roots.photos : url.host === 'drive' ? roots.drive : null;
    if (!root) return new Response('Unknown media host', { status: 404 });

    const relPath = decodeURIComponent(url.pathname);
    const cleaned = normalize(join('/', relPath));
    const absolute = resolve(root, `.${cleaned}`);
    const rel = relative(root, absolute);
    if (rel.startsWith('..')) {
      return new Response('Forbidden', { status: 403 });
    }

    return net.fetch(pathToFileURL(absolute).toString());
  });
}
