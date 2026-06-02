<template>
    <div class='col-12 py-3'>
        <div class='card'>
            <div class='card-header'>
                <div class='card-title'>
                    TAK Portal
                </div>
            </div>
            <div class='card-body'>
                <TablerInput
                    v-model='local.takPortalUrl'
                    label='TAK Portal Base URL'
                    placeholder='https://takportal.example.com'
                    description='Used for locator API calls. SMS is sent via TAK Portal Server Settings (Twilio/Brevo).'
                />
                <p class='text-muted small mt-3 mb-0'>
                    Configure SMS provider and credentials under
                    <strong>TAK Portal → Server Settings → SMS</strong>.
                    Locator link URLs are built by TAK Portal when sending SMS.
                </p>
            </div>
        </div>

        <div class='d-flex flex-wrap gap-2 mt-3'>
            <button
                type='button'
                class='btn btn-primary'
                :disabled='saving'
                @click='save'
            >
                Save
            </button>
            <button
                type='button'
                class='btn btn-secondary'
                :disabled='testingPortal || !local.takPortalUrl.trim()'
                @click='testPortal'
            >
                Test TAK Portal Connection
            </button>
            <button
                type='button'
                class='btn btn-outline-secondary'
                :disabled='unchanged'
                @click='reset'
            >
                Reset
            </button>
        </div>

        <TablerLoading
            v-if='saving || testingPortal'
            class='mt-3'
            :compact='true'
            :desc='loadingDesc'
        />

        <div
            v-if='successMessage'
            class='alert alert-success mt-3'
            role='alert'
        >
            {{ successMessage }}
        </div>

        <TablerAlert
            v-if='error'
            class='mt-3'
            :err='error'
        />
    </div>
</template>

<script setup lang='ts'>
import { computed, reactive, ref, watch } from 'vue';
import { TablerInput, TablerLoading, TablerAlert } from '@tak-ps/vue-tabler';
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
        const portalBase = local.takPortalUrl.trim();
        if (err instanceof TypeError && /failed to fetch/i.test(err.message)) {
            error.value = new Error(
                `Unable to reach TAK Portal API from this browser.\n\n` +
                `This is usually caused by either (a) missing Authentik session cookies for ` +
                `https://${portalBase.replace(/^https?:\/\//i, '')}/ in this browser, or (b) CORS not ` +
                `being applied to Authentik/redirect responses for /api/locate/*.\n\n` +
                `Fix: open https://${portalBase.replace(/^https?:\/\//i, '')}/locate in this browser ` +
                `and sign in as this account, confirm it works there, then retry "Test TAK Portal Connection".`,
            );
        } else {
            error.value = err instanceof Error ? err : new Error(String(err));
        }
    } finally {
        testingPortal.value = false;
    }
}
</script>
