<template>
    <div class='col-12'>
        <div class='row g-2'>
            <div class='col-12'>
                <TablerEnum
                    v-model='local.channel'
                    label='TAK channel'
                    description='People on this channel can create locators.'
                    :options='channelOptions'
                    :disabled='saving || testingPortal || !hasChannelChoices'
                />
            </div>
            <div class='col-12'>
                <p class='text-muted small mb-2'>
                    Save publishes the TAK Portal URL on the channel above.
                    Configure SMS provider and credentials under
                    <strong>TAK Portal → Server Settings → SMS</strong>.
                </p>
                <TablerInput
                    v-model='local.takPortalUrl'
                    label='TAK Portal Base URL'
                    placeholder='https://takportal.example.com'
                    description='Public share links use this URL. Locator API calls go through CloudTAK.'
                />
            </div>
            <div class='col-12'>
                <button
                    type='button'
                    class='btn btn-secondary w-100'
                    :disabled='testingPortal || saving || !local.takPortalUrl.trim()'
                    @click='testPortal'
                >
                    Test TAK Portal Connection
                </button>
            </div>
            <div class='col-12'>
                <button
                    type='button'
                    class='btn btn-primary w-100 mt-2'
                    :disabled='saving || testingPortal || !local.channel.trim() || !local.takPortalUrl.trim()'
                    @click='save'
                >
                    Save
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
            v-if='saving || testingPortal || loadingGroups'
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

        <TablerInlineAlert
            v-if='groupWarning'
            class='mt-3'
            severity='warning'
            title='TAK channels'
            :description='groupWarning'
        />

        <TablerAlert
            v-if='error'
            class='mt-3'
            :err='error'
        />
    </div>
</template>

<script setup lang='ts'>
import { computed, onMounted, reactive, ref } from 'vue';
import {
    TablerAlert,
    TablerEnum,
    TablerInlineAlert,
    TablerInput,
    TablerLoading,
} from '@tak-ps/vue-tabler';
import { testTakPortalConnection } from '../api/tak-portal-client.ts';
import {
    assertPortalUrl,
    listUserChannels,
    loadAdminDraft,
    publishPortalSettings,
    saveAdminDraft,
    type AdminDraft,
} from '../lib/portal-source.ts';

const emit = defineEmits<{
    published: [];
}>();

function cloneDraft(draft: AdminDraft): AdminDraft {
    return { channel: draft.channel, takPortalUrl: draft.takPortalUrl };
}

const local = reactive<AdminDraft>(cloneDraft(loadAdminDraft()));
const saved = ref<AdminDraft>(cloneDraft(local));
const groups = ref<string[]>([]);
const loadingGroups = ref(false);
const saving = ref(false);
const testingPortal = ref(false);
const error = ref<Error | undefined>();
const successMessage = ref('');
const groupWarning = ref('');

const channelOptions = computed(() => {
    const names = [...groups.value];
    if (local.channel && !names.includes(local.channel)) {
        names.unshift(local.channel);
    }
    return ['', ...names.filter((name) => name !== '')];
});

const hasChannelChoices = computed(() => channelOptions.value.some((name) => name !== ''));

const unchanged = computed(() =>
    local.channel === saved.value.channel && local.takPortalUrl === saved.value.takPortalUrl,
);

const loadingDesc = computed(() => {
    if (saving.value) return 'Publishing TAK Portal URL…';
    if (testingPortal.value) return 'Contacting TAK Portal…';
    if (loadingGroups.value) return 'Loading channels…';
    return '';
});

function clearFeedback(): void {
    error.value = undefined;
    successMessage.value = '';
}

async function loadGroups(): Promise<void> {
    loadingGroups.value = true;
    groupWarning.value = '';
    try {
        groups.value = await listUserChannels();
        if (!groups.value.length) {
            groupWarning.value = 'This account has no TAK channels.';
        }
    } catch (err) {
        groupWarning.value = err instanceof Error ? err.message : String(err);
    } finally {
        loadingGroups.value = false;
    }
}

async function save(): Promise<void> {
    clearFeedback();
    const channel = local.channel.trim();
    if (!channel) {
        error.value = new Error('Choose a TAK channel.');
        return;
    }

    let takPortalUrl: string;
    try {
        takPortalUrl = assertPortalUrl(local.takPortalUrl);
    } catch (err) {
        error.value = err instanceof Error ? err : new Error(String(err));
        return;
    }

    saving.value = true;
    try {
        await publishPortalSettings(channel, takPortalUrl);
        const next = { channel, takPortalUrl };
        saveAdminDraft(next);
        saved.value = cloneDraft(next);
        local.channel = channel;
        local.takPortalUrl = takPortalUrl;
        successMessage.value = `TAK Portal URL published to ${channel}.`;
        emit('published');
    } catch (err) {
        error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
        saving.value = false;
    }
}

function reset(): void {
    clearFeedback();
    local.channel = saved.value.channel;
    local.takPortalUrl = saved.value.takPortalUrl;
}

async function testPortal(): Promise<void> {
    clearFeedback();
    let takPortalUrl: string;
    try {
        takPortalUrl = assertPortalUrl(local.takPortalUrl);
    } catch (err) {
        error.value = err instanceof Error ? err : new Error(String(err));
        return;
    }

    testingPortal.value = true;
    try {
        const locators = await testTakPortalConnection(takPortalUrl);
        successMessage.value = `TAK Portal connection OK (${locators.length} locator(s) visible).`;
    } catch (err) {
        error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
        testingPortal.value = false;
    }
}

onMounted(() => {
    void loadGroups();
});
</script>
