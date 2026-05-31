export function normalizeTakPortalBaseUrl(url: string): string {
    return String(url || '').trim().replace(/\/+$/, '');
}

export function publicLocateUrl(takPortalBaseUrl: string, slug: string): string {
    const base = normalizeTakPortalBaseUrl(takPortalBaseUrl);
    return `${base}/locate/${encodeURIComponent(slug)}`;
}

export function locateLinkSmsBody(takPortalBaseUrl: string, slug: string): string {
    const url = publicLocateUrl(takPortalBaseUrl, slug);
    return `Please open this link on your phone to share your location with responders:\n\n${url}`;
}

export function clampPingIntervalSeconds(raw: number): number {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n)) return 60;
    if (n === 0) return 0;
    return Math.min(86400, Math.max(10, n));
}
