import { std } from '@/std.ts';
import { normalizeTakPortalBaseUrl } from './locator-url.ts';

export const PORTAL_UNAVAILABLE_MESSAGE =
    'A CloudTAK admin must set a TAK Portal URL for one of this account\'s channels before you can create locators.';

const ADMIN_DRAFT_KEY = 'cloudtak-plugin-locator-admin:v1';
const LEGACY_SETTINGS_KEY = 'cloudtak-plugin-locator-settings';

export type AdminDraft = {
    channel: string;
    takPortalUrl: string;
};

export type PortalSettings = {
    channel: string;
    takPortalUrl: string;
};

export type SharedPortal =
    | { ok: true; takPortalUrl: string; channel: string }
    | { ok: false; reason: 'missing' | 'error'; message: string };

export function loadAdminDraft(): AdminDraft {
    let channel = '';
    let takPortalUrl = '';
    try {
        const raw = localStorage.getItem(ADMIN_DRAFT_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as Partial<AdminDraft>;
            if (typeof parsed.channel === 'string') channel = parsed.channel;
            if (typeof parsed.takPortalUrl === 'string') takPortalUrl = parsed.takPortalUrl;
        }
    } catch {
        channel = '';
        takPortalUrl = '';
    }

    if (!takPortalUrl.trim()) {
        try {
            const raw = localStorage.getItem(LEGACY_SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as { takPortalUrl?: unknown };
                if (typeof parsed.takPortalUrl === 'string') takPortalUrl = parsed.takPortalUrl;
            }
        } catch {
            takPortalUrl = '';
        }
    }

    return {
        channel: channel.trim(),
        takPortalUrl: normalizeTakPortalBaseUrl(takPortalUrl),
    };
}

export function saveAdminDraft(draft: AdminDraft): void {
    localStorage.setItem(ADMIN_DRAFT_KEY, JSON.stringify({
        channel: draft.channel.trim(),
        takPortalUrl: normalizeTakPortalBaseUrl(draft.takPortalUrl),
    }));
}

export function assertPortalUrl(raw: string): string {
    const url = normalizeTakPortalBaseUrl(raw);
    if (!url) throw new Error('Enter a TAK Portal Base URL.');

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error('TAK Portal Base URL must be a full URL.');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('TAK Portal Base URL must start with http:// or https://.');
    }
    return url;
}

/** Read the signed-in user's TAK channels. */
export async function listUserChannels(): Promise<string[]> {
    const listed = await std('/api/marti/group?useCache=true');
    const rows = listed && typeof listed === 'object' && Array.isArray((listed as { data?: unknown }).data)
        ? (listed as { data: { name?: unknown }[] }).data
        : null;
    if (!rows) throw new Error('Failed to load TAK channels');

    const names = new Set<string>();
    for (const row of rows) {
        if (typeof row.name === 'string' && row.name.trim()) names.add(row.name.trim());
    }
    return [...names].sort((a, b) => a.localeCompare(b));
}

export function userIsOnChannel(channel: string, groupNames: string[]): boolean {
    const wanted = channel.trim();
    return groupNames.some((name) => name.trim() === wanted);
}

export async function fetchIsSystemAdmin(): Promise<boolean> {
    try {
        const profile = await std('/api/profile') as { system_admin?: boolean };
        return profile?.system_admin === true;
    } catch {
        return false;
    }
}

function asSettings(raw: unknown): PortalSettings {
    const row = raw && typeof raw === 'object' ? raw as { channel?: unknown; takPortalUrl?: unknown } : {};
    return {
        channel: typeof row.channel === 'string' ? row.channel.trim() : '',
        takPortalUrl: typeof row.takPortalUrl === 'string' ? normalizeTakPortalBaseUrl(row.takPortalUrl) : '',
    };
}

/** Saved admin setting. Empty strings mean nothing has been saved yet. */
export async function fetchPortalSettings(): Promise<PortalSettings> {
    return asSettings(await std('/api/locator/settings'));
}

/**
 * The URL is available only when this account's TAK channels include the
 * channel a system admin saved.
 */
export async function loadSharedPortal(): Promise<SharedPortal> {
    let saved: PortalSettings;
    try {
        saved = await fetchPortalSettings();
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, reason: 'error', message };
    }

    if (!saved.channel || !saved.takPortalUrl) {
        return { ok: false, reason: 'missing', message: PORTAL_UNAVAILABLE_MESSAGE };
    }

    let channels: string[];
    try {
        channels = await listUserChannels();
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, reason: 'error', message };
    }

    if (!userIsOnChannel(saved.channel, channels)) {
        return {
            ok: false,
            reason: 'missing',
            message: `Locators are limited to the ${saved.channel} channel.`,
        };
    }

    return { ok: true, takPortalUrl: saved.takPortalUrl, channel: saved.channel };
}

/** Save the URL in CloudTAK for one TAK channel. System admin only. */
export async function publishPortalSettings(channel: string, takPortalUrl: string): Promise<void> {
    const group = channel.trim();
    const url = assertPortalUrl(takPortalUrl);
    if (!group) throw new Error('Choose a TAK channel.');

    await std('/api/locator/settings', {
        method: 'PUT',
        body: { channel: group, takPortalUrl: url },
    });
}
