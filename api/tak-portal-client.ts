import type { HistoryEntry, Locator } from '../lib/types.ts';
import { clampPingIntervalSeconds } from '../lib/locator-url.ts';
import { std } from '@/std.ts';

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error?: string; message?: string };

function bridgeUrl(portalPath: string): string {
    const [pathPart, query] = portalPath.split('?');
    const normalized = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
    const suffix = normalized.startsWith('/api/locate')
        ? normalized.slice('/api/locate'.length)
        : normalized;
    const bridged = `/api/takportal/locate${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
    return query ? `${bridged}?${query}` : bridged;
}

function readBridgeError(err: unknown): Error {
    if (err instanceof Error && 'body' in err) {
        const body = (err as Error & { body?: unknown }).body;
        if (body && typeof body === 'object') {
            if ('error' in body && body.error) {
                return new Error(String((body as ApiErr).error));
            }
            if ('message' in body && body.message) {
                return new Error(String((body as { message: string }).message));
            }
        }
    }
    return err instanceof Error ? err : new Error(String(err));
}

async function portalFetch<T>(
    _baseUrl: string,
    path: string,
    init?: RequestInit,
): Promise<T> {
    const method = (init?.method || 'GET').toUpperCase();
    let body: unknown;
    if (init?.body !== undefined && init.body !== null) {
        body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    }

    // Let CloudTAK std() stringify object bodies. If we pass Content-Type here
    // without a string body, fetch sends "[object Object]" and the API returns 400 HTML.
    const headers: Record<string, string> = { Accept: 'application/json' };
    for (const [key, value] of Object.entries(
        (init?.headers as Record<string, string> | undefined) || {},
    )) {
        if (key.toLowerCase() !== 'content-type') {
            headers[key] = value;
        }
    }

    try {
        return await std(bridgeUrl(path), {
            method,
            body,
            headers,
        }) as Promise<T>;
    } catch (err) {
        throw readBridgeError(err);
    }
}

export async function testTakPortalConnection(baseUrl: string): Promise<Locator[]> {
    const data = await portalFetch<ApiOk<{ locators: Locator[] }>>(
        baseUrl,
        '/api/locate/locators',
    );
    return data.locators ?? [];
}

export type LocateChannel = {
    name: string;
    displayName: string;
    baseKey: string;
};

export async function listLocateMeta(
    baseUrl: string,
): Promise<{ channels: LocateChannel[]; colors: string[] }> {
    const data = await portalFetch<ApiOk<{ channels?: LocateChannel[]; colors?: string[] }>>(
        baseUrl,
        '/api/locate/meta',
    );
    return {
        channels: Array.isArray(data.channels) ? data.channels : [],
        colors: Array.isArray(data.colors) ? data.colors.filter((c) => typeof c === 'string' && c) : [],
    };
}

export async function listLocateMissions(baseUrl: string, channel: string): Promise<string[]> {
    const name = String(channel || '').trim();
    if (!name) return [];
    const data = await portalFetch<ApiOk<{ missions?: { name?: string }[] }>>(
        baseUrl,
        `/api/locate/missions?channel=${encodeURIComponent(name)}`,
    );
    return (data.missions ?? [])
        .map((m) => String(m?.name || '').trim())
        .filter(Boolean);
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
    input: {
        title?: string;
        pingIntervalSeconds?: number;
        channel: string;
        mission?: string;
        color?: string;
    },
): Promise<Locator> {
    const channel = String(input.channel || '').trim();
    if (!channel) throw new Error('Channel is required.');
    const mission = String(input.mission || '').trim();
    const color = String(input.color || 'Magenta').trim() || 'Magenta';

    const body: Record<string, unknown> = {
        title: String(input.title || '').trim(),
        pingIntervalSeconds: clampPingIntervalSeconds(
            input.pingIntervalSeconds ?? 60,
        ),
        channel,
        color,
    };
    if (mission) body.mission = mission;

    const data = await portalFetch<ApiOk<{ locator: Locator }>>(
        baseUrl,
        '/api/locate/locators',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
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

export async function downloadLocatorReport(id: string): Promise<void> {
    await std(`/api/takportal/locate/locators/${encodeURIComponent(id)}/report.pdf`, {
        download: 'locate-report.pdf',
    });
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
