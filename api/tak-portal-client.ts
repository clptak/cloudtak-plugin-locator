import type { HistoryEntry, Locator } from '../lib/types.ts';
import { normalizeTakPortalBaseUrl, clampPingIntervalSeconds } from '../lib/locator-url.ts';

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error?: string; message?: string };

async function readApiError(res: Response): Promise<string> {
    const text = await res.text();
    if (!text) return `HTTP ${res.status} ${res.statusText || ''}`.trim();

    try {
        const j = JSON.parse(text) as ApiErr;
        if (j.error) return j.error;
        if (j.message) return j.message;
    } catch {
        // not JSON
    }

    return text.length > 500 ? text.slice(0, 500) + '…' : text;
}

async function portalFetch<T>(
    baseUrl: string,
    path: string,
    init?: RequestInit,
): Promise<T> {
    const root = normalizeTakPortalBaseUrl(baseUrl);
    if (!root) throw new Error('Configure TAK Portal Base URL in Settings.');

    const url = `${root}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url, {
        ...init,
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            ...(init?.headers || {}),
        },
    });

    if (!res.ok) {
        throw new Error(await readApiError(res));
    }

    return res.json() as Promise<T>;
}

export async function testTakPortalConnection(baseUrl: string): Promise<Locator[]> {
    const data = await portalFetch<ApiOk<{ locators: Locator[] }>>(
        baseUrl,
        '/api/locate/locators',
    );
    return data.locators ?? [];
}

export async function listLocators(baseUrl: string): Promise<Locator[]> {
    const data = await portalFetch<ApiOk<{ locators: Locator[] }>>(
        baseUrl,
        '/api/locate/locators',
    );
    return data.locators ?? [];
}

export async function createLocator(
    baseUrl: string,
    input: { title?: string; pingIntervalSeconds?: number },
): Promise<Locator> {
    const data = await portalFetch<ApiOk<{ locator: Locator }>>(
        baseUrl,
        '/api/locate/locators',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: String(input.title || '').trim(),
                pingIntervalSeconds: clampPingIntervalSeconds(
                    input.pingIntervalSeconds ?? 60,
                ),
            }),
        },
    );
    return data.locator;
}

export async function updateLocator(
    baseUrl: string,
    id: string,
    patch: { title?: string; pingIntervalSeconds?: number; active?: boolean },
): Promise<Locator> {
    const body: Record<string, unknown> = {};
    if (patch.title !== undefined) body.title = String(patch.title).trim();
    if (patch.pingIntervalSeconds !== undefined) {
        body.pingIntervalSeconds = clampPingIntervalSeconds(patch.pingIntervalSeconds);
    }
    if (patch.active !== undefined) body.active = patch.active;

    const data = await portalFetch<ApiOk<{ locator: Locator }>>(
        baseUrl,
        `/api/locate/locators/${encodeURIComponent(id)}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        },
    );
    return data.locator;
}

export async function archiveLocator(baseUrl: string, id: string): Promise<Locator> {
    const data = await portalFetch<ApiOk<{ locator: Locator }>>(
        baseUrl,
        `/api/locate/locators/${encodeURIComponent(id)}/archive`,
        { method: 'POST' },
    );
    return data.locator;
}

export async function reactivateLocator(baseUrl: string, id: string): Promise<Locator> {
    const data = await portalFetch<ApiOk<{ locator: Locator }>>(
        baseUrl,
        `/api/locate/locators/${encodeURIComponent(id)}/reactivate`,
        { method: 'POST' },
    );
    return data.locator;
}

export async function deleteLocator(baseUrl: string, id: string): Promise<void> {
    await portalFetch<ApiOk<Record<string, never>>>(
        baseUrl,
        `/api/locate/locators/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
    );
}

export async function manualPing(baseUrl: string, id: string): Promise<string> {
    const data = await portalFetch<ApiOk<{ message?: string }>>(
        baseUrl,
        `/api/locate/locators/${encodeURIComponent(id)}/manual-ping`,
        { method: 'POST' },
    );
    return data.message || 'Devices with this link open will send a location update soon.';
}

export async function listHistory(
    baseUrl: string,
    id: string,
    limit = 200,
): Promise<HistoryEntry[]> {
    const data = await portalFetch<ApiOk<{ history: HistoryEntry[] }>>(
        baseUrl,
        `/api/locate/locators/${encodeURIComponent(id)}/history?limit=${limit}`,
    );
    return data.history ?? [];
}

/** Send public locate link via TAK Portal (uses Server Settings SMS / Twilio). */
export async function sendLocatorLinkSms(
    baseUrl: string,
    id: string,
    phones: string,
): Promise<number> {
    const data = await portalFetch<ApiOk<{ count: number }>>(
        baseUrl,
        `/api/locate/locators/${encodeURIComponent(id)}/send-link-sms`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phones: String(phones || '').trim() }),
        },
    );
    return data.count ?? 0;
}
