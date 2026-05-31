<template>
    <div class='col-12 py-3'>
        <LocatorCreateCard
            :loading='creating'
            @create='onCreate'
        />

        <TablerLoading
            v-if='loading'
            class='mt-3'
            :compact='true'
            desc='Loading locators…'
        />

        <TablerAlert
            v-else-if='loadError'
            class='mt-3'
            :err='loadError'
        />

        <template v-else>
            <LocatorTable
                root-class='mt-3'
                title='Active Locators'
                :locators='activeLocators'
                :tak-portal-url='store.settings.takPortalUrl'
                @send-sms='openSendSms'
                @manual-ping='onManualPing'
                @history='openHistory'
                @archive='onArchive'
                @delete='onDelete'
            />

            <LocatorTable
                v-if='archivedLocators.length'
                root-class='mt-3'
                title='Archived Locators'
                :locators='archivedLocators'
                archived
                :tak-portal-url='store.settings.takPortalUrl'
                @reactivate='onReactivate'
                @delete='onDelete'
            />
        </template>

        <LocatorSendSmsModal
            v-if='sendSmsLocator'
            :locator='sendSmsLocator'
            :tak-portal-url='store.settings.takPortalUrl'
            :default-phones='defaultSendPhones'
            :sending='sendingSms'
            @close='sendSmsLocator = null'
            @send='onSendSms'
        />

        <LocatorHistoryPanel
            v-if='historyLocator'
            :locator='historyLocator'
            :entries='historyEntries'
            :loading='historyLoading'
            :error='historyError'
            @close='closeHistory'
        />

        <div
            v-if='actionMessage'
            class='alert alert-info mt-3'
            role='alert'
        >
            {{ actionMessage }}
        </div>
    </div>
</template>

<script setup lang='ts'>
import { computed, onMounted, ref } from 'vue';
import { TablerLoading, TablerAlert } from '@tak-ps/vue-tabler';
import { useLocatorStore } from '../stores/plugin-state.ts';
import type { HistoryEntry, Locator } from '../lib/types.ts';
import {
    archiveLocator,
    createLocator,
    deleteLocator,
    listHistory,
    listLocators,
    manualPing,
    reactivateLocator,
    sendLocatorLinkSms,
} from '../api/tak-portal-client.ts';
import LocatorCreateCard from './LocatorCreateCard.vue';
import LocatorTable from './LocatorTable.vue';
import LocatorSendSmsModal from './LocatorSendSmsModal.vue';
import LocatorHistoryPanel from './LocatorHistoryPanel.vue';

const store = useLocatorStore();

const locators = ref<Locator[]>([]);
const loading = ref(false);
const loadError = ref<Error | undefined>();
const creating = ref(false);
const sendingSms = ref(false);
const sendSmsLocator = ref<Locator | null>(null);
const defaultSendPhones = ref('');
const actionMessage = ref('');

const historyLocator = ref<Locator | null>(null);
const historyEntries = ref<HistoryEntry[]>([]);
const historyLoading = ref(false);
const historyError = ref<Error | undefined>();

const activeLocators = computed(() => locators.value.filter((l) => !l.archived));
const archivedLocators = computed(() => locators.value.filter((l) => l.archived));

function requirePortalUrl(): string {
    const url = store.settings.takPortalUrl.trim();
    if (!url) throw new Error('Configure TAK Portal Base URL in Settings.');
    return url;
}

async function refresh() {
    if (!store.hasTakPortalUrl()) {
        loadError.value = new Error('Configure TAK Portal Base URL in Settings.');
        locators.value = [];
        return;
    }

    loadError.value = undefined;
    loading.value = true;
    try {
        locators.value = await listLocators(requirePortalUrl());
    } catch (err) {
        loadError.value = err instanceof Error ? err : new Error(String(err));
    } finally {
        loading.value = false;
    }
}

async function onCreate(payload: { title: string; pingIntervalSeconds: number }) {
    creating.value = true;
    actionMessage.value = '';
    try {
        const loc = await createLocator(requirePortalUrl(), payload);
        await refresh();
        sendSmsLocator.value = loc;
        defaultSendPhones.value = '';
    } catch (err) {
        loadError.value = err instanceof Error ? err : new Error(String(err));
    } finally {
        creating.value = false;
    }
}

function openSendSms(loc: Locator) {
    sendSmsLocator.value = loc;
    defaultSendPhones.value = '';
}

async function onSendSms(phones: string) {
    if (!sendSmsLocator.value) return;

    sendingSms.value = true;
    actionMessage.value = '';
    loadError.value = undefined;
    try {
        const count = await sendLocatorLinkSms(
            requirePortalUrl(),
            sendSmsLocator.value.id,
            phones,
        );
        actionMessage.value = `SMS sent to ${count} number(s) via TAK Portal.`;
        sendSmsLocator.value = null;
    } catch (err) {
        loadError.value = err instanceof Error ? err : new Error(String(err));
    } finally {
        sendingSms.value = false;
    }
}

async function onManualPing(loc: Locator) {
    actionMessage.value = '';
    try {
        actionMessage.value = await manualPing(requirePortalUrl(), loc.id);
    } catch (err) {
        loadError.value = err instanceof Error ? err : new Error(String(err));
    }
}

async function openHistory(loc: Locator) {
    historyLocator.value = loc;
    historyEntries.value = [];
    historyError.value = undefined;
    historyLoading.value = true;
    try {
        historyEntries.value = await listHistory(requirePortalUrl(), loc.id);
    } catch (err) {
        historyError.value = err instanceof Error ? err : new Error(String(err));
    } finally {
        historyLoading.value = false;
    }
}

function closeHistory() {
    historyLocator.value = null;
    historyEntries.value = [];
    historyError.value = undefined;
}

async function onArchive(loc: Locator) {
    actionMessage.value = '';
    try {
        await archiveLocator(requirePortalUrl(), loc.id);
        await refresh();
        actionMessage.value = `Archived "${loc.title}".`;
    } catch (err) {
        loadError.value = err instanceof Error ? err : new Error(String(err));
    }
}

async function onReactivate(loc: Locator) {
    actionMessage.value = '';
    try {
        await reactivateLocator(requirePortalUrl(), loc.id);
        await refresh();
        actionMessage.value = `Reactivated "${loc.title}".`;
    } catch (err) {
        loadError.value = err instanceof Error ? err : new Error(String(err));
    }
}

async function onDelete(loc: Locator) {
    if (!confirm(`Permanently delete locator "${loc.title}" and its history?`)) return;

    actionMessage.value = '';
    try {
        await deleteLocator(requirePortalUrl(), loc.id);
        if (historyLocator.value?.id === loc.id) closeHistory();
        await refresh();
        actionMessage.value = `Deleted "${loc.title}".`;
    } catch (err) {
        loadError.value = err instanceof Error ? err : new Error(String(err));
    }
}

onMounted(() => {
    void refresh();
});
</script>
