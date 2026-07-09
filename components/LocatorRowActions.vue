<template>
    <div class='d-flex flex-wrap gap-1'>
        <template v-if='!archived'>
            <button
                type='button'
                class='btn btn-sm btn-primary'
                @click='emit("send-sms", locator)'
            >
                Send SMS
            </button>
            <button
                type='button'
                class='btn btn-sm btn-secondary'
                @click='emit("manual-ping", locator)'
            >
                Manual ping
            </button>
            <button
                type='button'
                class='btn btn-sm btn-secondary'
                @click='emit("history", locator)'
            >
                History
            </button>
            <a
                class='btn btn-sm btn-outline-secondary'
                :href='publicUrl'
                target='_blank'
                rel='noopener noreferrer'
            >
                Link
            </a>
            <button
                type='button'
                class='btn btn-sm btn-outline-secondary'
                @click='emit("archive", locator)'
            >
                Archive
            </button>
        </template>
        <template v-else>
            <button
                type='button'
                class='btn btn-sm btn-secondary'
                @click='emit("reactivate", locator)'
            >
                Reactivate
            </button>
        </template>
        <button
            type='button'
            class='btn btn-sm btn-outline-danger'
            @click='emit("delete", locator)'
        >
            Delete
        </button>
    </div>
</template>

<script setup lang='ts'>
import { computed } from 'vue';
import type { Locator } from '../lib/types.ts';
import { publicLocateUrl } from '../lib/locator-url.ts';

const props = defineProps<{
    locator: Locator;
    takPortalUrl: string;
    archived?: boolean;
}>();

const emit = defineEmits<{
    'send-sms': [locator: Locator];
    'manual-ping': [locator: Locator];
    history: [locator: Locator];
    archive: [locator: Locator];
    reactivate: [locator: Locator];
    delete: [locator: Locator];
}>();

const publicUrl = computed(() => publicLocateUrl(props.takPortalUrl, props.locator.slug));
</script>
