import { std, stdurl } from '@/std.ts';
import { normalizeTakPortalBaseUrl } from './locator-url.ts';
import { extractPackageJson } from './package-zip.ts';

export const PORTAL_PACKAGE_NAME = 'cloudtak_locator_portal';
export const PORTAL_FILE_NAME = 'cloudtak_locator_portal.json';
export const PORTAL_UNAVAILABLE_MESSAGE =
    'A CloudTAK admin must publish a TAK Portal URL for this account\'s channel before you can create locators.';

const ADMIN_DRAFT_KEY = 'cloudtak-plugin-locator-admin:v1';
const LEGACY_SETTINGS_KEY = 'cloudtak-plugin-locator-settings';

export type AdminDraft = {
    channel: string;
    takPortalUrl: string;
};

export type SharedPortal =
    | { ok: true; takPortalUrl: string; channel: string }
    | { ok: false; reason: 'missing' | 'error'; message: string };

type PackageRow = {
    uid: string;
    name: string;
    hash: string;
    created: number;
};

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

export async function fetchIsSystemAdmin(): Promise<boolean> {
    try {
        const profile = await std('/api/profile') as { system_admin?: boolean };
        return profile?.system_admin === true;
    } catch {
        return false;
    }
}

function packageRows(listed: unknown): PackageRow[] {
    if (!listed || typeof listed !== 'object' || !Array.isArray((listed as { items?: unknown }).items)) {
        return [];
    }

    const rows: PackageRow[] = [];
    for (const item of (listed as { items: unknown[] }).items) {
        if (!item || typeof item !== 'object') continue;
        const row = item as { uid?: unknown; name?: unknown; hash?: unknown; created?: unknown };
        if (row.name !== PORTAL_PACKAGE_NAME) continue;
        if (typeof row.uid !== 'string' || !row.uid) continue;
        if (typeof row.hash !== 'string' || !row.hash) continue;
        const created = typeof row.created === 'string' ? Date.parse(row.created) : 0;
        rows.push({
            uid: row.uid,
            name: row.name,
            hash: row.hash,
            created: Number.isNaN(created) ? 0 : created,
        });
    }
    rows.sort((a, b) => b.created - a.created);
    return rows;
}

async function listPortalPackages(): Promise<PackageRow[]> {
    const url = stdurl('/api/marti/package');
    url.searchParams.set('filter', PORTAL_PACKAGE_NAME);

    const listed = await std(url);
    if (!listed || typeof listed !== 'object' || !Array.isArray((listed as { items?: unknown }).items)) {
        throw new Error('Locator package list was not understood.');
    }
    return packageRows(listed);
}

function parsePortalJson(text: string): SharedPortal {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return { ok: false, reason: 'error', message: 'Locator package is not valid JSON.' };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, reason: 'error', message: 'Locator package must be an object.' };
    }

    const record = parsed as { takPortalUrl?: unknown; channel?: unknown };
    const takPortalUrl = typeof record.takPortalUrl === 'string'
        ? normalizeTakPortalBaseUrl(record.takPortalUrl)
        : '';
    if (!takPortalUrl) {
        return { ok: false, reason: 'error', message: 'Locator package is missing a TAK Portal URL.' };
    }

    const channel = typeof record.channel === 'string' ? record.channel.trim() : '';
    return { ok: true, takPortalUrl, channel };
}

async function readPackageText(hash: string): Promise<string> {
    const fileUrl = stdurl(`/api/marti/api/files/${encodeURIComponent(hash)}`);
    fileUrl.searchParams.set('name', `${PORTAL_PACKAGE_NAME}.zip`);
    const downloaded = await std(fileUrl);

    if (downloaded instanceof Response) {
        return extractPackageJson(await downloaded.arrayBuffer(), PORTAL_FILE_NAME);
    }
    if (typeof downloaded === 'string') return downloaded;
    if (downloaded && typeof downloaded === 'object') return JSON.stringify(downloaded);
    throw new Error('Locator package download was not a file.');
}

/** Load the portal URL from a package this account can see. */
export async function loadSharedPortal(): Promise<SharedPortal> {
    let rows: PackageRow[];
    try {
        rows = await listPortalPackages();
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, reason: 'error', message: `Locator package list failed: ${message}` };
    }

    const newest = rows[0];
    if (!newest) {
        return { ok: false, reason: 'missing', message: PORTAL_UNAVAILABLE_MESSAGE };
    }

    try {
        const text = await readPackageText(newest.hash);
        return parsePortalJson(text);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, reason: 'error', message };
    }
}

/**
 * Publish the URL onto one channel using the signed-in user's TAK certificate.
 * TAK Server only lists that package for members of the channel.
 */
export async function publishPortalSettings(channel: string, takPortalUrl: string): Promise<void> {
    const group = channel.trim();
    const url = assertPortalUrl(takPortalUrl);
    if (!group) throw new Error('Choose a TAK channel.');

    const upload = stdurl('/api/marti/package');
    upload.searchParams.set('name', PORTAL_PACKAGE_NAME);
    upload.searchParams.append('groups', group);
    upload.searchParams.append('keywords', 'cloudtak-locator');

    const body = new FormData();
    body.append(
        'file',
        new File(
            [JSON.stringify({ takPortalUrl: url, channel: group })],
            PORTAL_FILE_NAME,
            { type: 'application/json' },
        ),
    );

    await std(upload, { method: 'POST', body });
}
