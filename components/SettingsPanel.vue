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
                    description='Used for locator create/list/archive API calls and the public share link.'
                />
            </div>
        </div>

        <div class='card mt-3'>
            <div class='card-header'>
                <div class='card-title'>
                    Twilio (per-user SMS)
                </div>
            </div>
            <div class='card-body'>
                <p class='text-muted small mb-3'>
                    SMS is sent directly from this plugin using <strong>your</strong> Twilio
                    credentials, routed through CloudTAK's outbound proxy. Only users who supply
                    valid credentials can send locator links.
                </p>
                <TablerInput
                    v-model='local.twilioAccountSid'
                    label='Account SID'
                    placeholder='ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                />
                <TablerInput
                    v-model='local.twilioAuthToken'
                    label='Auth Token'
                    type='password'
                    class='mt-2'
                    placeholder='your Twilio auth token'
                />
                <TablerInput
                    v-model='local.twilioFromNumber'
                    label='From Number'
                    class='mt-2'
                    placeholder='+15551234567'
                />
                <TablerInput
                    v-model='local.twilioTestToNumber'
                    label='Test To Number'
                    class='mt-2'
                    placeholder='+15559876543'
                    description='Used only by "Send Test SMS".'
                />
                <p class='text-muted small mt-3 mb-0'>
                    Requires the CloudTAK admin to enable the HTTP proxy and whitelist
                    <code>https://api.twilio.com</code> under
                    <strong>Admin → Proxy</strong>.
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
                class='btn btn-secondary'
                :disabled='testingSms || !canTestSms'
                @click='testSms'
            >
                Send Test SMS
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
            v-if='saving || testingPortal || testingSms'
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
import { sendTestSms } from '../api/twilio-client.ts';
import type { PluginSettings } from '../lib/types.ts';

const store = useLocatorStore();

function cloneSettings(s: PluginSettings): PluginSettings {
    return { ...s };
}

const local = reactive<PluginSettings>(cloneSettings(store.settings));
const saving = ref(false);
const testingPortal = ref(false);
const testingSms = ref(false);
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

const canTestSms = computed(() =>
    Boolean(
        local.twilioAccountSid.trim()
        && local.twilioAuthToken.trim()
        && local.twilioFromNumber.trim()
        && local.twilioTestToNumber.trim(),
    ),
);

const loadingDesc = computed(() => {
    if (saving.value) return 'Saving…';
    if (testingPortal.value) return 'Contacting TAK Portal…';
    if (testingSms.value) return 'Sending test SMS…';
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

async function testSms() {
    clearFeedback();
    store.saveSettings(cloneSettings(local));
    testingSms.value = true;
    try {
        const count = await sendTestSms(
            store.twilioCredentials(),
            store.settings.twilioTestToNumber,
        );
        successMessage.value = `Test SMS sent to ${count} number(s).`;
    } catch (err) {
        error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
        testingSms.value = false;
    }
}
</script>
