<template>
    <div class='locator-popout d-flex flex-column'>
        <div
            class='d-flex align-items-center px-2 border-bottom flex-shrink-0'
            style='height: 50px;'
        >
            <IconDeviceMobilePin
                class='flex-shrink-0'
                :size='20'
                stroke='1.5'
            />
            <span class='ms-2 text-truncate'>Locator</span>
        </div>
        <div class='flex-grow-1 min-height-0 overflow-auto'>
            <LocatorPane />
        </div>
    </div>
</template>

<script setup lang='ts'>
import { IconDeviceMobilePin } from '@tabler/icons-vue';
import LocatorPane from '../LocatorPane.vue';
</script>

<style>
.locator-popout {
    height: 100vh;
    background-color: var(--tblr-bg-surface, #182433);
    color: var(--tblr-body-color, #dce1e7);
}
</style>
