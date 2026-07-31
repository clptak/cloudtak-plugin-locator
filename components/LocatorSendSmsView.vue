<template>
    <div>
        <p class='text-muted small mb-3'>
            {{ locator.title }}
            <span class='ms-1'>({{ locator.slug }})</span>
        </p>
        <TablerInput
            v-model='phones'
            label='Phone numbers (SMS)'
            placeholder='+15551234567, 5559876543'
            description='Sent via TAK Portal (Server Settings → SMS). Comma- or semicolon-separated.'
        />
        <div
            v-if='previewUrl'
            class='mt-3 small text-muted'
        >
            Link:
            <a
                :href='previewUrl'
                target='_blank'
                rel='noopener noreferrer'
            >{{ previewUrl }}</a>
        </div>
        <TablerAlert
            v-if='displayError'
            class='mt-3'
            :err='displayError'
        />
        <button
            type='button'
            class='btn btn-primary w-100 mt-3'
            :disabled='sending || !phones.trim()'
            @click='submit'
        >
            {{ sending ? 'Sending…' : 'Send SMS' }}
        </button>
    </div>
</template>

<script setup lang='ts'>
import { computed, ref, watch } from 'vue';
import { TablerInput, TablerAlert } from '@tak-ps/vue-tabler';
import type { Locator } from '../lib/types.ts';
import { publicLocateUrl } from '../lib/locator-url.ts';

const props = defineProps<{
    locator: Locator;
    takPortalUrl: string;
    defaultPhones?: string;
    sending?: boolean;
    error?: Error;
}>();

const emit = defineEmits<{
    send: [phones: string];
}>();

const phones = ref(props.defaultPhones || '');
const localError = ref<Error | undefined>();

const displayError = computed(() => props.error || localError.value);

watch(
    () => props.defaultPhones,
    (value) => {
        phones.value = value || '';
    },
);

const previewUrl = computed(() => {
    if (!props.takPortalUrl.trim()) return '';
    return publicLocateUrl(props.takPortalUrl, props.locator.slug);
});

function submit() {
    localError.value = undefined;
    try {
        emit('send', phones.value.trim());
    } catch (err) {
        localError.value = err instanceof Error ? err : new Error(String(err));
    }
}
</script>
