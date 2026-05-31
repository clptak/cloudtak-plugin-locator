<template>
    <div class='card'>
        <div class='card-header'>
            <div class='card-title'>
                Create Locator
            </div>
        </div>
        <div class='card-body'>
            <TablerInput
                v-model='title'
                class='mb-3'
                label='Title (optional)'
                placeholder='Missing Person'
            />
            <TablerInput
                v-model.number='pingIntervalSeconds'
                type='number'
                label='Ping interval (seconds)'
                :description='intervalHelp'
            />
            <button
                type='button'
                class='btn btn-primary mt-2'
                :disabled='loading || pingIntervalInvalid'
                @click='submit'
            >
                Create locator
            </button>
        </div>
    </div>
</template>

<script setup lang='ts'>
import { computed, ref } from 'vue';
import { TablerInput } from '@tak-ps/vue-tabler';
import { clampPingIntervalSeconds } from '../lib/locator-url.ts';

const props = defineProps<{
    loading?: boolean;
}>();

const emit = defineEmits<{
    create: [payload: { title: string; pingIntervalSeconds: number }];
}>();

const title = ref('');
const pingIntervalSeconds = ref(60);

const intervalHelp = computed(() =>
    '0 = one-time only; otherwise 10–86400 seconds.',
);

const pingIntervalInvalid = computed(() => {
    const n = Number(pingIntervalSeconds.value);
    if (!Number.isFinite(n)) return true;
    if (n === 0) return false;
    return n < 10 || n > 86400;
});

function submit() {
    if (props.loading || pingIntervalInvalid.value) return;
    emit('create', {
        title: title.value.trim(),
        pingIntervalSeconds: clampPingIntervalSeconds(pingIntervalSeconds.value),
    });
}
</script>
