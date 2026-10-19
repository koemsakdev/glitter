/** Minimal request shape we read from (Express). */
export interface ReqLike {
  ip?: string;
  socket?: { remoteAddress?: string };
  headers: Record<string, string | string[] | undefined>;
}

const header = (req: ReqLike, name: string): string | undefined => {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
};

function clean(ip: string | undefined): string {
  if (!ip) return 'unknown';
  const v = ip.trim();
  return v.startsWith('::ffff:') ? v.slice(7) : v;
}

/**
 * The visitor's real IP. Behind a proxy (Render, Cloudflare…) the socket
 * address is the proxy, so we read the forwarding headers. The LEFT entries
 * of X-Forwarded-For are whatever the client sent (spoofable); proxies append
 * the address they actually saw on the right — so we count TRUSTED_PROXY_HOPS
 * (default 1) in from the right.
 */
export function clientIp(req: ReqLike): { ip: string; chain: string | null } {
  const xff = header(req, 'x-forwarded-for');
  // Only trust Cloudflare's header when the site is really behind Cloudflare
  // (otherwise anyone could send it to fake their IP).
  const cf =
    process.env.TRUST_CLOUDFLARE === 'true'
      ? header(req, 'cf-connecting-ip')
      : undefined;
  if (cf) return { ip: clean(cf), chain: xff ?? null };
  if (xff) {
    const parts = xff
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? 1));
    const pick = parts[Math.max(0, parts.length - hops)];
    return { ip: clean(pick), chain: xff.slice(0, 512) };
  }
  const real = header(req, 'x-real-ip');
  if (real) return { ip: clean(real), chain: null };
  return { ip: clean(req.socket?.remoteAddress ?? req.ip), chain: null };
}

export function isPrivateIp(ip: string): boolean {
  return (
    ip === 'unknown' ||
    ip === '::1' ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith('fc') ||
    ip.startsWith('fd') ||
    ip.startsWith('fe80')
  );
}

/** Browser / OS / device from a User-Agent string (common cases). */
export function parseUserAgent(ua: string | undefined): {
  browser: string | null;
  os: string | null;
  deviceType: string;
} {
  if (!ua) return { browser: null, os: null, deviceType: 'unknown' };
  const m = (re: RegExp) => re.exec(ua);
  const v = (r: RegExpExecArray | null) =>
    r?.[1] ? ` ${r[1].split('.')[0]}` : '';

  let browser: string | null = null;
  let r: RegExpExecArray | null;
  if ((r = m(/Edg(?:e|A|iOS)?\/([\d.]+)/))) browser = `Edge${v(r)}`;
  else if ((r = m(/OPR\/([\d.]+)/))) browser = `Opera${v(r)}`;
  else if ((r = m(/SamsungBrowser\/([\d.]+)/)))
    browser = `Samsung Internet${v(r)}`;
  else if ((r = m(/(?:Chrome|CriOS)\/([\d.]+)/))) browser = `Chrome${v(r)}`;
  else if ((r = m(/(?:Firefox|FxiOS)\/([\d.]+)/))) browser = `Firefox${v(r)}`;
  else if ((r = m(/Version\/([\d.]+).*Safari/))) browser = `Safari${v(r)}`;
  else if (
    (r = m(
      /(curl|Wget|python-requests|PostmanRuntime|axios|node-fetch|Go-http-client|okhttp|Java)\/?([\d.]*)/i,
    ))
  )
    browser = r[1];

  let os: string | null = null;
  if ((r = m(/Windows NT ([\d.]+)/)))
    os =
      { '10.0': 'Windows 10/11', '6.3': 'Windows 8.1', '6.1': 'Windows 7' }[
        r[1]
      ] ?? `Windows NT ${r[1]}`;
  else if ((r = m(/(?:iPhone|CPU) OS ([\d_]+)/)))
    os = `iOS ${r[1].split('_')[0]}`;
  else if ((r = m(/iPad.*OS ([\d_]+)/))) os = `iPadOS ${r[1].split('_')[0]}`;
  else if ((r = m(/Mac OS X ([\d_.]+)/)))
    os = `macOS ${r[1].replace(/_/g, '.').split('.').slice(0, 2).join('.')}`;
  else if ((r = m(/Android ([\d.]+)/))) os = `Android ${r[1].split('.')[0]}`;
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  const bot =
    /bot|crawl|spider|curl|wget|python|postman|axios|node-fetch|go-http|okhttp|java\//i.test(
      ua,
    );
  const deviceType = bot
    ? 'bot'
    : /iPad|Tablet/i.test(ua)
      ? 'tablet'
      : /Mobi|iPhone|Android/i.test(ua)
        ? 'mobile'
        : 'desktop';
  return { browser, os, deviceType };
}
