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
    let parsed = '';
    if (err instanceof Error && 'body' in err) {
        const body = (err as Error & { body?: unknown }).body;
        if (body && typeof body === 'object') {
            if ('error' in body && body.error) {
                parsed = String((body as ApiErr).error);
            } else if ('message' in body && body.message) {
                parsed = String((body as { message: string }).message);
            }
        }
    }
    const out = parsed
        ? new Error(parsed)
        : (err instanceof Error ? err : new Error(String(err)));
    // #region agent log
    fetch('http://127.0.0.1:7766/ingest/b99aed6b-aeaa-4ac7-9f78-aa5b2dff3df2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4f73a6'},body:JSON.stringify({sessionId:'4f73a6',location:'api/tak-portal-client.ts:readBridgeError',message:'bridge error',data:{parsed:parsed||out.message,status:(err as {status?:unknown})?.status??null},timestamp:Date.now(),hypothesisId:'C',runId:'pre-fix'})}).catch(()=>{});
    // #endregion
    return out;
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

export async function listLocators(baseUrl: string): Promise<Locator[]> {
    const data = await portalFetch<ApiOk<{ locators: Locator[] }>>(
        baseUrl,
        '/api/locate/locators',
    );
    return data.locators ?? [];
}

export async function createLocator(
    baseUrl: string,
    input: { title?: string; pingIntervalSeconds?: number; channel: string },
): Promise<Locator> {
    const channel = String(input.channel || '').trim();
    // #region agent log
    fetch('http://127.0.0.1:7766/ingest/b99aed6b-aeaa-4ac7-9f78-aa5b2dff3df2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4f73a6'},body:JSON.stringify({sessionId:'4f73a6',location:'api/tak-portal-client.ts:createLocator',message:'create payload channel',data:{channel,channelEmpty:!channel},timestamp:Date.now(),hypothesisId:'B',runId:'pre-fix'})}).catch(()=>{});
    // #endregion
    if (!channel) throw new Error('Channel is required.');

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
                channel,
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
