<template>
    <TaskbarChipButton
        :icon='IconDeviceMobilePin'
        label='Locator'
        title='Open Locator'
        @click='openDesktopPane'
    />
</template>

<script setup lang='ts'>
import { IconDeviceMobilePin } from '@tabler/icons-vue';
import TaskbarChipButton from './TaskbarChipButton.vue';
import { openDesktopPane } from '../lib/floatMinimize.ts';
</script>
