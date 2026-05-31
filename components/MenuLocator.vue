<template>
    <MenuTemplate name='Locator'>
        <TablerPillGroup
            v-model='activeTab'
            :options='tabs'
        >
            <template #option='{ option }'>
                <component
                    :is='tabIcons[option.value]'
                    v-tooltip='option.label'
                    :size='32'
                    stroke='1'
                />
            </template>
        </TablerPillGroup>

        <CellphoneTab v-if='activeTab === "cellphone"' />
        <SmsLocatorTab v-else-if='activeTab === "sms"' />
        <SettingsPanel v-else-if='activeTab === "settings"' />
    </MenuTemplate>
</template>

<script setup lang='ts'>
import { ref } from 'vue';
import type { Component } from 'vue';
import { TablerPillGroup } from '@tak-ps/vue-tabler';
import {
    IconDeviceMobile,
    IconDeviceMobileMessage,
    IconSettings,
} from '@tabler/icons-vue';
import MenuTemplate from '@/components/CloudTAK/util/MenuTemplate.vue';
import CellphoneTab from './CellphoneTab.vue';
import SmsLocatorTab from './SmsLocatorTab.vue';
import SettingsPanel from './SettingsPanel.vue';

const activeTab = ref<string>('cellphone');

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
</script>
