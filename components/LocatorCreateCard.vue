<template>
    <div class='row g-2'>
        <div class='col-12'>
            <TablerInput
                v-model='title'
                label='Title (optional)'
                placeholder='Missing Person'
            />
        </div>
        <div class='col-12'>
            <TablerInput
                v-model.number='pingIntervalSeconds'
                type='number'
                label='Ping interval (seconds)'
                :description='intervalHelp'
            />
        </div>
        <div class='col-12'>
            <button
                type='button'
                class='btn btn-primary w-100 mt-2'
                :disabled='props.loading || pingIntervalInvalid'
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

const props = withDefaults(defineProps<{
    loading?: boolean;
}>(), {
    loading: false,
});

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
    emit('create', {
        title: title.value.trim(),
        pingIntervalSeconds: clampPingIntervalSeconds(Number(pingIntervalSeconds.value)),
    });
}
</script>
