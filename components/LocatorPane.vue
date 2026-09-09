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
            <TablerPillGroup
                v-model='activeTab'
                :options='tabs'
                name='locator-main-tabs'
            />

            <CellphoneTab v-if='activeTab === "cellphone"' />
            <SmsLocatorTab
                v-else-if='activeTab === "sms"'
                @history='pushHistory'
                @send-sms='pushSendSms'
            />
            <SettingsPanel v-else-if='activeTab === "settings"' />
        </template>
    </div>
</template>

<script setup lang='ts'>
import { computed, ref } from 'vue';
import { TablerPillGroup, TablerIconButton } from '@tak-ps/vue-tabler';
import { IconCircleArrowLeft } from '@tabler/icons-vue';
import CellphoneTab from './CellphoneTab.vue';
import SmsLocatorTab from './SmsLocatorTab.vue';
import SettingsPanel from './SettingsPanel.vue';
import LocatorHistoryView from './LocatorHistoryView.vue';
import LocatorSendSmsView from './LocatorSendSmsView.vue';
import { useLocatorStore } from '../stores/plugin-state.ts';
import type { HistoryEntry, Locator } from '../lib/types.ts';
import { listHistory, sendLocatorLinkSms } from '../api/tak-portal-client.ts';

type Screen = 'main' | 'history' | 'send-sms';

const store = useLocatorStore();

const activeTab = ref<string>('cellphone');
const screen = ref<Screen>('main');
const drillLocator = ref<Locator | null>(null);
const defaultSendPhones = ref('');
const sendingSms = ref(false);

const historyEntries = ref<HistoryEntry[]>([]);
const historyLoading = ref(false);
const historyError = ref<Error | undefined>();
const sendSmsError = ref<Error | undefined>();

const tabs = [
    { value: 'cellphone', label: 'Cellphone Data' },
    { value: 'sms', label: 'SMS Locator' },
    { value: 'settings', label: 'Settings' },
];

const screenTitle = computed(() => {
    if (screen.value === 'history') return 'Locator history';
    if (screen.value === 'send-sms') return 'Send locator link';
    return 'Locator';
});

function requirePortalUrl(): string {
    const url = store.settings.takPortalUrl.trim();
    if (!url) throw new Error('Configure TAK Portal Base URL in Settings.');
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
}
</style>
