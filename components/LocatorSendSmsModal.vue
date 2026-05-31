<template>
    <div
        class='modal modal-blur show d-block'
        tabindex='-1'
        role='dialog'
        @click.self='emit("close")'
    >
        <div
            class='modal-dialog modal-dialog-centered'
            role='document'
        >
            <div class='modal-content'>
                <div class='modal-header'>
                    <h5 class='modal-title'>
                        Send Locator Link
                    </h5>
                    <button
                        type='button'
                        class='btn-close'
                        aria-label='Close'
                        @click='emit("close")'
                    />
                </div>
                <div class='modal-body'>
                    <p class='text-muted small mb-3'>
                        {{ locator.title }}
                        <span class='ms-1'>({{ locator.slug }})</span>
                    </p>
                    <TablerInput
                        v-model='phones'
                        label='Phone numbers (SMS)'
                        placeholder='+15551234567, 5559876543'
                        description='Sent from your Twilio account (configured in Settings). Comma- or semicolon-separated.'
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
                        v-if='error'
                        class='mt-3'
                        :err='error'
                    />
                </div>
                <div class='modal-footer'>
                    <button
                        type='button'
                        class='btn btn-secondary'
                        :disabled='sending'
                        @click='emit("close")'
                    >
                        Close
                    </button>
                    <button
                        type='button'
                        class='btn btn-primary'
                        :disabled='sending || !phones.trim()'
                        @click='submit'
                    >
                        Send SMS
                    </button>
                </div>
            </div>
        </div>
    </div>
    <div class='modal-backdrop fade show' />
</template>

<script setup lang='ts'>
import { computed, ref } from 'vue';
import { TablerInput, TablerAlert } from '@tak-ps/vue-tabler';
import type { Locator } from '../lib/types.ts';
import { publicLocateUrl } from '../lib/locator-url.ts';

const props = defineProps<{
    locator: Locator;
    takPortalUrl: string;
    defaultPhones?: string;
    sending?: boolean;
}>();

const emit = defineEmits<{
    close: [];
    send: [phones: string];
}>();

const phones = ref(props.defaultPhones || '');
const error = ref<Error | undefined>();

const previewUrl = computed(() => {
    if (!props.takPortalUrl.trim()) return '';
    return publicLocateUrl(props.takPortalUrl, props.locator.slug);
});

async function submit() {
    error.value = undefined;
    try {
        emit('send', phones.value.trim());
    } catch (err) {
        error.value = err instanceof Error ? err : new Error(String(err));
    }
}
</script>
