<template>
    <div class='col-12'>
        <div class='row g-2'>
            <div class='col-12'>
                <TablerInput
                    v-model='local.takPortalUrl'
                    label='TAK Portal Base URL'
                    placeholder='https://takportal.example.com'
                    description='Public share links use this URL. Locator API calls go through CloudTAK (same-origin bridge).'
                />
            </div>
            <div class='col-12'>
                <p class='text-muted small mb-0'>
                    Configure SMS provider and credentials under
                    <strong>TAK Portal → Server Settings → SMS</strong>.
                    Locator link URLs are built by TAK Portal when sending SMS.
                </p>
            </div>
            <div class='col-12'>
                <button
                    type='button'
                    class='btn btn-primary w-100 mt-2'
                    :disabled='saving'
                    @click='save'
                >
                    Save
                </button>
            </div>
            <div class='col-12'>
                <button
                    type='button'
                    class='btn btn-secondary w-100'
                    :disabled='testingPortal || !local.takPortalUrl.trim()'
                    @click='testPortal'
                >
                    Test TAK Portal Connection
                </button>
            </div>
            <div class='col-12'>
                <button
                    type='button'
                    class='btn btn-outline-secondary w-100'
                    :disabled='unchanged'
                    @click='reset'
                >
                    Reset
                </button>
            </div>
        </div>

        <TablerLoading
            v-if='saving || testingPortal'
            class='mt-3'
            :compact='true'
            :desc='loadingDesc'
        />

        <TablerInlineAlert
            v-if='successMessage'
            class='mt-3'
            severity='success'
            title='Settings'
            :description='successMessage'
        />

        <TablerAlert
            v-if='error'
            class='mt-3'
            :err='error'
        />
    </div>
</template>

<script setup lang='ts'>
import { computed, reactive, ref, watch } from 'vue';
import {
    TablerInput,
    TablerLoading,
    TablerAlert,
    TablerInlineAlert,
} from '@tak-ps/vue-tabler';
import { useLocatorStore } from '../stores/plugin-state.ts';
import { testTakPortalConnection } from '../api/tak-portal-client.ts';
import type { PluginSettings } from '../lib/types.ts';

const store = useLocatorStore();

function cloneSettings(s: PluginSettings): PluginSettings {
    return { ...s };
}

const local = reactive<PluginSettings>(cloneSettings(store.settings));
const saving = ref(false);
const testingPortal = ref(false);
const error = ref<Error | undefined>();
const successMessage = ref('');

watch(
    () => store.settings,
    (s) => {
        Object.assign(local, cloneSettings(s));
    },
    { deep: true },
);

const unchanged = computed(() =>
    JSON.stringify(local) === JSON.stringify(store.settings),
);

const loadingDesc = computed(() => {
    if (saving.value) return 'Saving…';
    if (testingPortal.value) return 'Contacting TAK Portal…';
    return '';
});

function clearFeedback() {
    error.value = undefined;
    successMessage.value = '';
}

function save() {
    clearFeedback();
    saving.value = true;
    try {
        store.saveSettings(cloneSettings(local));
        successMessage.value = 'Settings saved.';
    } finally {
        saving.value = false;
    }
}

function reset() {
    clearFeedback();
    Object.assign(local, cloneSettings(store.settings));
}

async function testPortal() {
    clearFeedback();
    store.patchSettings({ takPortalUrl: local.takPortalUrl.trim() });
    testingPortal.value = true;
    try {
        const locators = await testTakPortalConnection(store.settings.takPortalUrl);
        successMessage.value = `TAK Portal connection OK (${locators.length} locator(s) visible).`;
    } catch (err) {
        error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
        testingPortal.value = false;
    }
}
</script>
