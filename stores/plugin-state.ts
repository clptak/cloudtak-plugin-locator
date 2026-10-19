import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PluginSettings } from '../lib/types.ts';
import { loadSharedPortal as fetchSharedPortal } from '../lib/portal-source.ts';

const DEFAULT_SETTINGS: PluginSettings = {
    takPortalUrl: '',
    channel: '',
};

const SHOW_HISTORY_KEY = 'locator-plugin:show-history';

function readShowHistoryOnMap(): boolean {
    try {
        return localStorage.getItem(SHOW_HISTORY_KEY) === 'true';
    } catch {
        return false;
    }
}

export const useLocatorStore = defineStore('locator-plugin', () => {
    const settings = ref<PluginSettings>({ ...DEFAULT_SETTINGS });
    const enabled = ref(false);
    const showHistoryOnMap = ref(readShowHistoryOnMap());
    const loadingPortal = ref(false);
    const portalError = ref<Error | undefined>();

    function setEnabled(value: boolean): void {
        enabled.value = value;
    }

    function setShowHistoryOnMap(value: boolean): void {
        showHistoryOnMap.value = value;
        try {
            localStorage.setItem(SHOW_HISTORY_KEY, value ? 'true' : 'false');
        } catch {
            /* private browsing */
        }
    }

    function clearPortal(): void {
        settings.value = { ...DEFAULT_SETTINGS };
    }

    async function loadSharedPortal(): Promise<void> {
        loadingPortal.value = true;
        portalError.value = undefined;
        try {
            const result = await fetchSharedPortal();
            if (result.ok) {
                settings.value = {
                    takPortalUrl: result.takPortalUrl,
                    channel: result.channel,
                };
                portalError.value = undefined;
                return;
            }
            clearPortal();
            portalError.value = result.reason === 'error' ? new Error(result.message) : undefined;
        } catch (err) {
            clearPortal();
            portalError.value = err instanceof Error ? err : new Error(String(err));
        } finally {
            loadingPortal.value = false;
        }
    }

    function hasTakPortalUrl(): boolean {
        return Boolean(settings.value.takPortalUrl.trim());
    }

    return {
        settings,
        enabled,
        showHistoryOnMap,
        loadingPortal,
        portalError,
        setEnabled,
        setShowHistoryOnMap,
        loadSharedPortal,
        hasTakPortalUrl,
    };
});
