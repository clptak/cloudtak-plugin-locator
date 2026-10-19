<template>
    <div class='col-12'>
        <TablerLoading
            v-if='store.loadingPortal'
            class='mt-3'
            :compact='true'
            desc='Loading TAK Portal settings…'
        />

        <TablerAlert
            v-else-if='store.portalError'
            class='mt-3'
            :err='store.portalError'
        />

        <TablerInlineAlert
            v-else-if='!store.hasTakPortalUrl()'
            class='mt-3'
            severity='info'
            title='Locators'
            :description='PORTAL_UNAVAILABLE_MESSAGE'
        />

        <template v-else>
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
                <TablerToggle
                    class='mt-3'
                    :model-value='store.showHistoryOnMap'
                    label='Show locator history'
                    description='Draws each active locator on the Locator history overlay every 15 seconds. Does not write to DataSync.'
                    @update:model-value='onShowHistory'
                />

                <LocatorTable
                    root-class='mt-3'
                    title='Active Locators'
                    :locators='activeLocators'
                    :tak-portal-url='store.settings.takPortalUrl'
                    :can-post-data-sync='canPostDataSync'
                    :posting-id='postingId'
                    @send-sms='emit("send-sms", $event)'
                    @manual-ping='onManualPing'
                    @history='emit("history", $event)'
                    @post-data-sync='onPostDataSync'
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

            <TablerInlineAlert
                v-if='actionError'
                class='mt-3'
                severity='danger'
                title='DataSync'
                :description='actionError'
            />

            <TablerInlineAlert
                v-if='actionMessage'
                class='mt-3'
                severity='info'
                title='Action'
                :description='actionMessage'
            />
        </template>
    </div>
</template>

<script setup lang='ts'>
import { computed, ref, watch } from 'vue';
import { TablerLoading, TablerAlert, TablerInlineAlert, TablerToggle } from '@tak-ps/vue-tabler';
import { useMapStore } from '@/stores/map.ts';
import { useLocatorStore } from '../stores/plugin-state.ts';
import type { Locator } from '../lib/types.ts';
import {
    archiveLocator,
    createLocator,
    deleteLocator,
    listLocators,
    manualPing,
    reactivateLocator,
} from '../api/tak-portal-client.ts';
import LocatorCreateCard from './LocatorCreateCard.vue';
import LocatorTable from './LocatorTable.vue';
import { getLocatorHistoryMapSync } from '../lib/locator-history-map-sync.ts';
import { PORTAL_UNAVAILABLE_MESSAGE } from '../lib/portal-source.ts';

const emit = defineEmits<{
    history: [locator: Locator];
    'send-sms': [locator: Locator];
}>();

const store = useLocatorStore();
const mapStore = useMapStore();

const locators = ref<Locator[]>([]);
const loading = ref(false);
const loadError = ref<Error | undefined>();
const creating = ref(false);
const postingId = ref('');
const actionMessage = ref('');
const actionError = ref('');

const canPostDataSync = computed(() => Boolean(mapStore.mission?.meta.guid));

const activeLocators = computed(() => locators.value.filter((l) => !l.archived));
const archivedLocators = computed(() => locators.value.filter((l) => l.archived));

function requirePortalUrl(): string {
    const url = store.settings.takPortalUrl.trim();
    if (!url) throw new Error(PORTAL_UNAVAILABLE_MESSAGE);
    return url;
}

async function refresh() {
    if (!store.hasTakPortalUrl()) {
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
        const loc = await createLocator(requirePortalUrl(), {
            ...payload,
            channel: store.settings.channel,
        });
        await refresh();
        emit('send-sms', loc);
    } catch (err) {
        loadError.value = err instanceof Error ? err : new Error(String(err));
    } finally {
        creating.value = false;
    }
}

function onShowHistory(value: boolean): void {
    store.setShowHistoryOnMap(value);
    void getLocatorHistoryMapSync()?.syncOnce();
}

async function onManualPing(loc: Locator) {
    actionMessage.value = '';
    try {
        actionMessage.value = await manualPing(requirePortalUrl(), loc.id);
        void getLocatorHistoryMapSync()?.syncOnce();
    } catch (err) {
        loadError.value = err instanceof Error ? err : new Error(String(err));
    }
}

async function onPostDataSync(loc: Locator) {
    actionMessage.value = '';
    actionError.value = '';
    postingId.value = loc.id;
    try {
        const sync = getLocatorHistoryMapSync();
        if (!sync) throw new Error('Locator history is not running.');
        await sync.postLocator(requirePortalUrl(), loc);
        actionMessage.value = `Posted "${loc.title}" to DataSync.`;
    } catch (err) {
        actionError.value = err instanceof Error ? err.message : String(err);
    } finally {
        postingId.value = '';
    }
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
        await refresh();
        actionMessage.value = `Deleted "${loc.title}".`;
    } catch (err) {
        loadError.value = err instanceof Error ? err : new Error(String(err));
    }
}

watch(
    () => store.settings.takPortalUrl,
    () => {
        if (store.hasTakPortalUrl()) {
            void refresh();
            return;
        }
        locators.value = [];
        loadError.value = undefined;
    },
    { immediate: true },
);
</script>
