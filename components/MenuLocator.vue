<template>
    <MenuTemplate
        :name='screenTitle'
        :back='screen === "main"'
    >
        <template
            v-if='screen === "main"'
            #title
        >
            <IconDeviceMobilePin
                :size='24'
                stroke='1'
                class='flex-shrink-0'
            />
            <span class='strong user-select-none'>Locator</span>
        </template>

        <template #buttons>
            <TablerIconButton
                v-if='screen !== "main"'
                title='Back'
                @click='popScreen'
            >
                <IconCircleArrowLeft
                    :size='32'
                    stroke='1'
                />
            </TablerIconButton>
        </template>

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
            >
                <template #option='{ option }'>
                    <span class='d-inline-flex align-items-center gap-1'>
                        <component
                            :is='tabIcons[option.value]'
                            v-tooltip='isMobile ? undefined : option.label'
                            :size='32'
                            stroke='1'
                        />
                        <span
                            v-if='isMobile'
                            class='small'
                        >{{ shortTabLabel(option.value) }}</span>
                    </span>
                </template>
            </TablerPillGroup>

            <CellphoneTab v-if='activeTab === "cellphone"' />
            <SmsLocatorTab
                v-else-if='activeTab === "sms"'
                @history='pushHistory'
                @send-sms='pushSendSms'
            />
            <SettingsPanel v-else-if='activeTab === "settings"' />
        </template>
    </MenuTemplate>
</template>

<script setup lang='ts'>
import { computed, ref } from 'vue';
import type { Component } from 'vue';
import { TablerPillGroup, TablerIconButton } from '@tak-ps/vue-tabler';
import {
    IconCircleArrowLeft,
    IconDeviceMobile,
    IconDeviceMobileMessage,
    IconDeviceMobilePin,
    IconSettings,
} from '@tabler/icons-vue';
import { useAppStore } from '@/stores/app.ts';
import MenuTemplate from './MenuTemplate.vue';
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
const appStore = useAppStore();

const activeTab = ref<string>('cellphone');
const screen = ref<Screen>('main');
const drillLocator = ref<Locator | null>(null);
const defaultSendPhones = ref('');
const sendingSms = ref(false);

const historyEntries = ref<HistoryEntry[]>([]);
const historyLoading = ref(false);
const historyError = ref<Error | undefined>();
const sendSmsError = ref<Error | undefined>();

const isMobile = computed(() => appStore.isMobileDetected);

const tabs = [
    { value: 'cellphone', label: 'Cellphone Data' },
    { value: 'sms', label: 'SMS Locator' },
    { value: 'settings', label: 'Settings' },
];

const tabIcons: Record<string, Component> = {
    cellphone: IconDeviceMobile,
    sms: IconDeviceMobileMessage,
    settings: IconSettings,
};

const screenTitle = computed(() => {
    if (screen.value === 'history') return 'Locator history';
    if (screen.value === 'send-sms') return 'Send locator link';
    return 'Locator';
});

function shortTabLabel(value: string): string {
    const labels: Record<string, string> = {
        cellphone: 'Ping',
        sms: 'SMS',
        settings: 'Settings',
    };
    return labels[value] || value;
}

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
