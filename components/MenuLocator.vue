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
        <RapidsosTab v-else-if='activeTab === "rapidsos"' />
        <SettingsPanel v-else-if='activeTab === "settings"' />
    </MenuTemplate>
</template>

<script setup lang='ts'>
import { ref } from 'vue';
import type { Component } from 'vue';
import { TablerPillGroup } from '@tak-ps/vue-tabler';
import {
    IconDeviceMobile,
    IconMessage,
    IconSettings,
} from '@tabler/icons-vue';
import MenuTemplate from '@/components/CloudTAK/util/MenuTemplate.vue';
import CellphoneTab from './CellphoneTab.vue';
import SmsLocatorTab from './SmsLocatorTab.vue';
import RapidsosTab from './RapidsosTab.vue';
import RapidsosIcon from './RapidsosIcon.vue';
import SettingsPanel from './SettingsPanel.vue';

const activeTab = ref<string>('cellphone');

const tabs = [
    { value: 'cellphone', label: 'Cellphone Data' },
    { value: 'sms', label: 'SMS Locator' },
    { value: 'rapidsos', label: 'RapidSOS' },
    { value: 'settings', label: 'Settings' },
];

const tabIcons: Record<string, Component> = {
    cellphone: IconDeviceMobile,
    sms: IconMessage,
    rapidsos: RapidsosIcon,
    settings: IconSettings,
};
</script>
