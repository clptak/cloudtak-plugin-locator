import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PluginSettings } from '../lib/types.ts';

const STORAGE_KEY = 'cloudtak-plugin-locator-settings';

const DEFAULT_SETTINGS: PluginSettings = {
    takPortalUrl: '',
};

function readStoredSettings(): PluginSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        const parsed = JSON.parse(raw) as Partial<PluginSettings> & Record<string, unknown>;
        return {
            takPortalUrl: String(parsed.takPortalUrl || '').trim(),
        };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function persistSettings(settings: PluginSettings): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // localStorage may be unavailable
    }
}

export const useLocatorStore = defineStore('locator-plugin', () => {
    const settings = ref<PluginSettings>(readStoredSettings());
    const enabled = ref(false);

    function setEnabled(value: boolean): void {
        enabled.value = value;
    }

    function saveSettings(next: PluginSettings): void {
        settings.value = {
            takPortalUrl: next.takPortalUrl.trim(),
        };
        persistSettings(settings.value);
    }

    function patchSettings(patch: Partial<PluginSettings>): void {
        saveSettings({ ...settings.value, ...patch });
    }

    function hasTakPortalUrl(): boolean {
        return Boolean(settings.value.takPortalUrl.trim());
    }

    return {
        settings,
        enabled,
        setEnabled,
        saveSettings,
        patchSettings,
        hasTakPortalUrl,
    };
});
