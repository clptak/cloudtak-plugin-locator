export function userIsOnChannel(channel: string, groupNames: string[]): boolean {
    const wanted = channel.trim();
    return groupNames.some((name) => name.trim() === wanted);
}

type SavedPortal = { channel: string; takPortalUrl: string };

export type PortalAccess =
    | { ok: true; takPortalUrl: string; channel: string }
    | { ok: false; reason: 'missing'; message: string };

/** Null channels means the local list is not ready, so the form still opens. */
export function accessFromSavedChannels(
    saved: SavedPortal,
    channels: string[] | null,
    unavailableMessage: string,
): PortalAccess {
    if (!saved.channel || !saved.takPortalUrl) {
        return { ok: false, reason: 'missing', message: unavailableMessage };
    }
    // shortcut: unknown local channels skip this gate; TAK Portal still rejects an out-of-scope create. Enforce here once groups are cached before plugin enable.
    if (channels && !userIsOnChannel(saved.channel, channels)) {
        return {
            ok: false,
            reason: 'missing',
            message: `Locators are limited to the ${saved.channel} channel.`,
        };
    }
    return { ok: true, takPortalUrl: saved.takPortalUrl, channel: saved.channel };
}
