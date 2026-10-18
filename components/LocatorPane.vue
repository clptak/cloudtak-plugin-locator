<template>
    <div class='locator-pane px-3 py-3'>
        <div
            v-if='screen !== "main"'
            class='d-flex align-items-center gap-2 mb-2 pb-2 border-bottom'
        >
            <TablerIconButton
                title='Back'
                @click='popScreen'
            >
                <IconCircleArrowLeft
                    :size='28'
                    stroke='1'
                />
            </TablerIconButton>
            <span class='fw-semibold text-truncate'>{{ screenTitle }}</span>
        </div>

        <LocatorHistoryView
            v-if='screen === "history" && drillLocator'
            :locator='drillLocator'
            :entries='historyEntries'
            :loading='historyLoading'
            :error='historyError'
        />

        <LocatorSendSmsView
            v-else-if='screen === "send-sms" && drillLocator'
            :locator='drillLocator'
            :tak-portal-url='store.settings.takPortalUrl'
            :default-phones='defaultSendPhones'
            :sending='sendingSms'
            :error='sendSmsError'
            @send='onSendSms'
        />

        <template v-else>
            <div
                ref='chromeEl'
                class='locator-chrome'
            >
                <TablerPillGroup
                    :model-value='activeTab'
                    class='locator-main-tabs'
                    :options='tabs'
                    name='locator-main-tabs'
                    padding='px-2 py-1'
                    :full-width='true'
                    @update:model-value='onMainTab'
                >
                    <template #option='{ option }'>
                        <span class='d-inline-flex align-items-center gap-1'>
                            <component
                                :is='tabIcons[option.value]'
                                :size='16'
                                stroke='1.5'
                                class='flex-shrink-0'
                            />
                            <span>{{ option.label }}</span>
                        </span>
                    </template>
                </TablerPillGroup>

                <CellphoneTab v-if='activeTab === "cellphone"' />
                <SmsLocatorTab
                    v-else-if='activeTab === "sms"'
                    @history='pushHistory'
                    @send-sms='pushSendSms'
                />

                <div
                    v-if='isSystemAdmin'
                    class='border-top pt-3 mt-3'
                >
                    <SettingsPanel @published='onPortalPublished' />
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang='ts'>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { Component } from 'vue';
import { TablerPillGroup, TablerIconButton } from '@tak-ps/vue-tabler';
import {
    IconCircleArrowLeft,
    IconDeviceMobilePin,
    IconDeviceMobileSearch,
} from '@tabler/icons-vue';
import CellphoneTab from './CellphoneTab.vue';
import SmsLocatorTab from './SmsLocatorTab.vue';
import SettingsPanel from './SettingsPanel.vue';
import LocatorHistoryView from './LocatorHistoryView.vue';
import LocatorSendSmsView from './LocatorSendSmsView.vue';
import { useLocatorStore } from '../stores/plugin-state.ts';
import type { HistoryEntry, Locator } from '../lib/types.ts';
import { listHistory, sendLocatorLinkSms } from '../api/tak-portal-client.ts';
import { fitDesktopPaneWidth } from '../lib/floatMinimize.ts';
import { fetchIsSystemAdmin, PORTAL_UNAVAILABLE_MESSAGE } from '../lib/portal-source.ts';

type Screen = 'main' | 'history' | 'send-sms';

const store = useLocatorStore();

const activeTab = ref<string>('cellphone');
const screen = ref<Screen>('main');
const drillLocator = ref<Locator | null>(null);
const defaultSendPhones = ref('');
const sendingSms = ref(false);

const isSystemAdmin = ref(false);

const chromeEl = ref<HTMLElement | null>(null);
let paneObserver: ResizeObserver | null = null;

function syncPaneWidth(): void {
    const el = chromeEl.value;
    if (!el) return;
    // Horizontal padding on .locator-pane (px-3 = 1rem each side).
    const pad = 32;
    fitDesktopPaneWidth(Math.ceil(el.getBoundingClientRect().width) + pad);
}

onMounted(() => {
    void fetchIsSystemAdmin().then((admin) => {
        isSystemAdmin.value = admin;
        // #region agent log
        fetch('http://127.0.0.1:7766/ingest/b99aed6b-aeaa-4ac7-9f78-aa5b2dff3df2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4f73a6'},body:JSON.stringify({sessionId:'4f73a6',location:'components/LocatorPane.vue:onMounted',message:'cloudtak system admin flag',data:{isSystemAdmin:admin},timestamp:Date.now(),hypothesisId:'C',runId:'pre-fix'})}).catch(()=>{});
        // #endregion
    });
    const el = chromeEl.value;
    if (!el) return;
    paneObserver = new ResizeObserver(() => syncPaneWidth());
    paneObserver.observe(el);
    syncPaneWidth();
});

onUnmounted(() => {
    paneObserver?.disconnect();
    paneObserver = null;
});

const historyEntries = ref<HistoryEntry[]>([]);
const historyLoading = ref(false);
const historyError = ref<Error | undefined>();
const sendSmsError = ref<Error | undefined>();

const tabs = [
    { value: 'cellphone', label: 'Cellphone Data' },
    { value: 'sms', label: 'SMS Locator' },
];

const tabIcons: Record<string, Component> = {
    cellphone: IconDeviceMobilePin,
    sms: IconDeviceMobileSearch,
};

function onMainTab(value: string): void {
    activeTab.value = value;
}

async function onPortalPublished(): Promise<void> {
    await store.loadSharedPortal();
}

const screenTitle = computed(() => {
    if (screen.value === 'history') return 'Locator history';
    if (screen.value === 'send-sms') return 'Send locator link';
    return 'Locator';
});

function requirePortalUrl(): string {
    const url = store.settings.takPortalUrl.trim();
    if (!url) throw new Error(PORTAL_UNAVAILABLE_MESSAGE);
    return url;
}

function popScreen() {
    screen.value = 'main';
    drillLocator.value = null;
    historyEntries.value = [];
    historyError.value = undefined;
    sendSmsError.value = undefined;
    defaultSendPhones.value = '';
}

function pushSendSms(loc: Locator, phones = '') {
    drillLocator.value = loc;
    defaultSendPhones.value = phones;
    sendSmsError.value = undefined;
    screen.value = 'send-sms';
}

async function pushHistory(loc: Locator) {
    drillLocator.value = loc;
    screen.value = 'history';
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

async function onSendSms(phones: string) {
    if (!drillLocator.value) return;

    sendingSms.value = true;
    sendSmsError.value = undefined;
    try {
        await sendLocatorLinkSms(
            requirePortalUrl(),
            drillLocator.value.id,
            phones,
        );
        popScreen();
    } catch (err) {
        sendSmsError.value = err instanceof Error ? err : new Error(String(err));
    } finally {
        sendingSms.value = false;
    }
}
</script>

<style scoped>
.locator-pane {
    /* Match Mission Info insets; Tabler form surfaces are primary-tinted */
    --tabler-input-bg: var(--cloudtak-inset-bg);
    --tblr-bg-forms: var(--cloudtak-inset-bg);
    width: max-content;
    max-width: 100%;
}

.locator-chrome {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: max-content;
    max-width: 100%;
}

.locator-chrome :deep(.locator-main-tabs) {
    width: 100%;
    display: flex;
}

.locator-chrome :deep(.locator-subtabs) {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.25rem;
    width: max-content;
}

.locator-chrome :deep(.locator-control-width) {
    width: 100%;
}
</style>
