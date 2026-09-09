import { markRaw } from 'vue';
import type { Component } from 'vue';
import type { PluginAPI } from '@tak-ps/cloudtak';
import { useFloatStore } from '../../../src/stores/float.ts';
import { isPopoutOpen, focusPopout } from './popout.ts';

export const PANE_UID = 'locator';
export const BOTTOM_BAR_KEY = 'locator';

type HostFloatComponent = Component;

export type PaneGeometry = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export const DEFAULT_GEOMETRY: PaneGeometry = {
    width: 800,
    height: 640,
    x: 80,
    y: 60,
};

let api: PluginAPI | null = null;
let shellComponent: HostFloatComponent | null = null;
let savedGeometry: PaneGeometry | null = null;
let minimized = false;

export function bindFloatMinimize(opts: {
    api: PluginAPI;
    shell: HostFloatComponent;
}): void {
    api = opts.api;
    shellComponent = opts.shell;
}

export function isMinimized(): boolean {
    return minimized;
}

function requireApi(): PluginAPI {
    if (!api) throw new Error('floatMinimize not bound');
    return api;
}

function readGeometry(): PaneGeometry {
    const pluginApi = requireApi();
    const pane = useFloatStore(pluginApi.pinia).panes.get(PANE_UID);
    if (!pane) return { ...(savedGeometry ?? DEFAULT_GEOMETRY) };
    return {
        x: pane.x,
        y: pane.y,
        width: pane.width,
        height: pane.height,
    };
}

function showFloat(geometry: PaneGeometry): void {
    const pluginApi = requireApi();
    if (!shellComponent) {
        throw new Error('floatMinimize shell not configured');
    }
    // Use the float store directly (not api.float.add) so we can supply a custom
    // FloatingPane shell — api.float always wraps FloatingGeneric.
    useFloatStore(pluginApi.pinia).add({
        uid: PANE_UID,
        name: 'Locator',
        component: markRaw(shellComponent),
        width: geometry.width,
        height: geometry.height,
        x: geometry.x,
        y: geometry.y,
    });
}

function clearBottomBarChip(): void {
    try {
        requireApi().bottomBar.remove(BOTTOM_BAR_KEY);
    } catch {
        // Map / bottom bar may not be loaded during teardown
    }
}

/**
 * Open the desktop float, or restore it if currently minimized.
 * No-op if the float is already visible.
 */
export function openDesktopPane(): void {
    const pluginApi = requireApi();
    if (isPopoutOpen()) {
        focusPopout();
        return;
    }
    if (minimized) {
        minimized = false;
        if (!pluginApi.float.has(PANE_UID)) {
            showFloat(savedGeometry ?? DEFAULT_GEOMETRY);
        }
        return;
    }
    if (pluginApi.float.has(PANE_UID)) return;
    showFloat(savedGeometry ?? DEFAULT_GEOMETRY);
}

export function minimizeDesktopPane(): void {
    const pluginApi = requireApi();
    if (!pluginApi.float.has(PANE_UID) || minimized) return;

    savedGeometry = readGeometry();
    pluginApi.float.remove(PANE_UID);
    minimized = true;
}

export function restoreDesktopPane(): void {
    openDesktopPane();
}

export function cleanupFloatMinimize(): void {
    clearBottomBarChip();
    minimized = false;
    if (api?.float.has(PANE_UID)) {
        api.float.remove(PANE_UID);
    }
}
