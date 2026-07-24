/**
 * Thin client for rclone's remote-control (rc) HTTP/JSON API.
 * See https://rclone.org/rc/ for the protocol this wraps.
 */
export interface RcClientOptions {
  baseUrl: string;
  user: string;
  pass: string;
}

export class RcloneRcError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'RcloneRcError';
  }
}

export class RcClient {
  constructor(private readonly opts: RcClientOptions) {}

  async call<TResult = Record<string, unknown>>(
    endpoint: string,
    params: Record<string, unknown> = {},
  ): Promise<TResult> {
    const auth = Buffer.from(`${this.opts.user}:${this.opts.pass}`).toString('base64');
    const res = await fetch(`${this.opts.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(params),
    });

    const text = await res.text();
    const body = text ? safeJsonParse(text) : {};

    if (!res.ok) {
      let message = `rclone rc call to "${endpoint}" failed with status ${res.status}`;
      if (body && typeof body === 'object' && 'error' in body) {
        message = String((body as { error: unknown }).error);
      }
      throw new RcloneRcError(message, res.status, body);
    }

    return body as TResult;
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
