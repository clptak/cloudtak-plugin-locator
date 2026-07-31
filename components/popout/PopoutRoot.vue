<template>
    <div class='locator-popout d-flex flex-column'>
        <template v-if='paneOpen'>
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
                <div class='btn-list ms-auto'>
                    <TablerIconButton
                        title='Minimize to task bar'
                        @click='paneOpen = false'
                    >
                        <IconMinus
                            :size='24'
                            stroke='1'
                        />
                    </TablerIconButton>
                </div>
            </div>
            <div class='flex-grow-1 min-height-0 overflow-auto'>
                <LocatorPane />
            </div>
        </template>
        <div
            v-else
            class='flex-grow-1 d-flex align-items-center justify-content-center text-secondary'
        >
            <span>Locator is minimized — restore it from the task bar below.</span>
        </div>

        <div class='locator-popout-taskbar d-flex align-items-center justify-content-center gap-2 px-2 flex-shrink-0'>
            <TaskbarChipButton
                :icon='IconDeviceMobilePin'
                label='Locator'
                title='Open Locator'
                @click='paneOpen = true'
            />
        </div>
    </div>
</template>

<script setup lang='ts'>
import { ref } from 'vue';
import {
    IconDeviceMobilePin,
    IconMinus,
} from '@tabler/icons-vue';
import { TablerIconButton } from '@tak-ps/vue-tabler';
import LocatorPane from '../LocatorPane.vue';
import TaskbarChipButton from '../TaskbarChipButton.vue';

/**
 * Popout-local minimize state: independent of the main window's floatMinimize
 * state, so the popout pane minimizes to its own task bar separately.
 */
const paneOpen = ref(true);
</script>

<style>
.locator-popout {
    height: 100vh;
    background-color: var(--tblr-bg-surface, #182433);
    color: var(--tblr-body-color, #dce1e7);
}

.locator-popout-taskbar {
    height: 50px;
    background-color: rgba(0, 0, 0, 0.5);
    border-top: 1px solid var(--tblr-border-color, rgba(255, 255, 255, 0.15));
}
</style>
