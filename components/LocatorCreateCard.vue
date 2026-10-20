<template>
    <div class='row g-2'>
        <div class='col-12'>
            <TablerInput
                v-model='title'
                label='Title (optional)'
                placeholder='Subject&apos;s Name'
            />
        </div>
        <div class='col-12'>
            <TablerEnum
                v-model='channel'
                label='Channel (optional)'
                description='Leave blank to use the saved channel.'
                :options='channelOptions'
                :disabled='metaLoading'
            />
        </div>
        <div class='col-12'>
            <TablerEnum
                v-model='mission'
                label='DataSync (optional)'
                description='Only missions on the channel above.'
                :options='missionOptions'
                :disabled='metaLoading || missionsLoading || !effectiveChannel'
            />
        </div>
        <div
            ref='colorRoot'
            class='col-12'
        >
            <div class='px-2 user-select-none'>
                Icon color
            </div>
            <div class='position-relative'>
                <button
                    type='button'
                    class='form-select text-start d-flex align-items-center gap-2'
                    :aria-expanded='colorOpen'
                    @click='colorOpen = !colorOpen'
                >
                    <span
                        class='locator-color-chip'
                        :style='{ background: teamColorHex(color) }'
                    />
                    {{ color }}
                </button>
                <div
                    v-if='colorOpen'
                    class='locator-color-menu'
                    role='listbox'
                >
                    <button
                        v-for='name in colorOptions'
                        :key='name'
                        type='button'
                        class='locator-color-option'
                        role='option'
                        :aria-selected='name === color'
                        @click='pickColor(name)'
                    >
                        <span
                            class='locator-color-chip'
                            :style='{ background: teamColorHex(name) }'
                        />
                        {{ name }}
                    </button>
                </div>
            </div>
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
            <TablerBorder
                class='cloudtak-accent text-white'
                :fill-height='false'
                :shadow='false'
                gap='sm'
            >
                <template #label>
                    <button
                        type='button'
                        class='btn btn-link text-white text-decoration-none p-0 d-flex align-items-center gap-2'
                        :aria-expanded='fieldsOpen'
                        aria-controls='locator-extra-fields'
                        @click='fieldsOpen = !fieldsOpen'
                    >
                        <IconChevronRight
                            :size='18'
                            stroke='2'
                            class='locator-fields-chevron'
                            :class='{ "locator-fields-open": fieldsOpen }'
                        />
                        <span class='text-uppercase text-white-50 small'>
                            Additional fields
                        </span>
                    </button>
                </template>
                <div
                    v-if='fieldsOpen'
                    id='locator-extra-fields'
                    class='d-flex flex-column gap-2'
                >
                    <div>
                        <button
                            type='button'
                            class='btn btn-secondary'
                            :disabled='fields.length >= 40'
                            @click='fields = addLocateField(fields)'
                        >
                            Add Field
                        </button>
                    </div>
                    <div
                        v-for='row in fields'
                        :key='row.key'
                        class='border rounded-3 p-2'
                    >
                        <TablerEnum
                            label='Type'
                            :model-value='typeMenuLabel(row.type)'
                            :options='typeLabelsFor(fields, row)'
                            @update:model-value='applyFieldType(row, String($event))'
                        />
                        <TablerInput
                            v-model='row.label'
                            label='Label'
                        />
                        <TablerInput
                            v-if='row.type === "choice"'
                            v-model='row.options'
                            label='Options'
                            description='Comma-separated.'
                        />
                        <TablerToggle
                            v-model='row.required'
                            label='Required'
                        />
                        <button
                            type='button'
                            class='btn btn-outline-danger'
                            @click='removeField(row.key)'
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </TablerBorder>
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
        <div
            v-if='formError'
            class='col-12'
        >
            <TablerInlineAlert
                severity='danger'
                title='Create locator'
                :description='formError'
            />
        </div>
    </div>
</template>

<script setup lang='ts'>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { IconChevronRight } from '@tabler/icons-vue';
import { TablerBorder, TablerEnum, TablerInlineAlert, TablerInput, TablerToggle } from '@tak-ps/vue-tabler';
import { listLocateMeta, listLocateMissions } from '../api/tak-portal-client.ts';
import {
    addLocateField,
    applyFieldType,
    collectLocateFields,
    defaultLocateFields,
    typeLabelsFor,
    typeMenuLabel,
    type LocateFieldDraft,
    type LocateFieldPayload,
} from '../lib/locate-form.ts';
import { clampPingIntervalSeconds } from '../lib/locator-url.ts';

/** ATAK team colours. Same hex as CloudTAK team-colors.ts. */
const TEAM_COLOR_HEX: Record<string, string> = {
    White: '#FFFFFF',
    Yellow: '#FFFF00',
    Orange: '#FF7700',
    Magenta: '#FF00FF',
    Red: '#FF0000',
    Maroon: '#7F0000',
    Purple: '#7F007F',
    'Dark Blue': '#00007F',
    Blue: '#0000FF',
    Cyan: '#00FFFF',
    Teal: '#007F7F',
    Green: '#00FF00',
    'Dark Green': '#007F00',
    Brown: '#A0714F',
};

const FALLBACK_COLORS = Object.keys(TEAM_COLOR_HEX);

const props = withDefaults(defineProps<{
    loading?: boolean;
    takPortalUrl?: string;
    savedChannel?: string;
}>(), {
    loading: false,
    takPortalUrl: '',
    savedChannel: '',
});

const emit = defineEmits<{
    create: [payload: {
        title: string;
        pingIntervalSeconds: number;
        channel: string;
        mission: string;
        color: string;
        form: { fields: LocateFieldPayload[] };
    }];
}>();

const title = ref('');
const channel = ref('');
const mission = ref('');
const color = ref('Magenta');
const pingIntervalSeconds = ref(60);
const channelNames = ref<string[]>([]);
const missions = ref<string[]>([]);
const colors = ref<string[]>(FALLBACK_COLORS);
const metaLoading = ref(false);
const missionsLoading = ref(false);
const formError = ref('');
const fields = ref<LocateFieldDraft[]>(defaultLocateFields());
const fieldsOpen = ref(false);
const colorOpen = ref(false);
const colorRoot = ref<HTMLElement | null>(null);

const intervalHelp = computed(() =>
    '0 = one-time only; otherwise 10–86400 seconds.',
);

const effectiveChannel = computed(() => channel.value.trim() || props.savedChannel.trim());

const channelOptions = computed(() => ['', ...channelNames.value]);
const missionOptions = computed(() => ['', ...missions.value]);
const colorOptions = computed(() => colors.value.length ? colors.value : FALLBACK_COLORS);

const pingIntervalInvalid = computed(() => {
    const n = Number(pingIntervalSeconds.value);
    if (!Number.isFinite(n)) return true;
    if (n === 0) return false;
    return n < 10 || n > 86400;
});

function teamColorHex(name: string): string {
    return TEAM_COLOR_HEX[name] || '#FF00FF';
}

function pickColor(name: string): void {
    color.value = name;
    colorOpen.value = false;
}

function onDocumentClick(event: MouseEvent): void {
    const root = colorRoot.value;
    if (!root || !colorOpen.value) return;
    if (event.target instanceof Node && root.contains(event.target)) return;
    colorOpen.value = false;
}

async function loadMeta(): Promise<void> {
    const url = props.takPortalUrl.trim();
    if (!url) {
        channelNames.value = [];
        return;
    }
    metaLoading.value = true;
    formError.value = '';
    try {
        const meta = await listLocateMeta(url);
        const names = meta.channels
            .map((ch) => String(ch.displayName || ch.name || '').trim())
            .filter(Boolean);
        channelNames.value = [...new Set(names)];
        if (meta.colors.length) colors.value = meta.colors;
        if (!colors.value.includes(color.value)) color.value = 'Magenta';
    } catch (err) {
        channelNames.value = [];
        formError.value = err instanceof Error ? err.message : String(err);
    } finally {
        metaLoading.value = false;
    }
}

async function loadMissions(): Promise<void> {
    const url = props.takPortalUrl.trim();
    const name = effectiveChannel.value;
    if (!url || !name) {
        missions.value = [];
        mission.value = '';
        return;
    }
    missionsLoading.value = true;
    try {
        const next = await listLocateMissions(url, name);
        missions.value = next;
        if (mission.value && !next.includes(mission.value)) mission.value = '';
    } catch (err) {
        missions.value = [];
        mission.value = '';
        formError.value = err instanceof Error ? err.message : String(err);
    } finally {
        missionsLoading.value = false;
    }
}

function removeField(key: number): void {
    fields.value = fields.value.filter((row) => row.key !== key);
}

function submit() {
    formError.value = '';
    const chosenMission = mission.value.trim();
    if (chosenMission && !missions.value.includes(chosenMission)) {
        formError.value = 'That DataSync is not on the selected channel.';
        return;
    }
    const collected = collectLocateFields(fields.value);
    if (!collected.ok) {
        formError.value = collected.error;
        return;
    }
    emit('create', {
        title: title.value.trim(),
        pingIntervalSeconds: clampPingIntervalSeconds(Number(pingIntervalSeconds.value)),
        channel: channel.value.trim(),
        mission: chosenMission,
        color: color.value.trim() || 'Magenta',
        form: { fields: collected.fields },
    });
}

watch(() => props.takPortalUrl, () => {
    void loadMeta();
}, { immediate: true });

watch(effectiveChannel, () => {
    void loadMissions();
}, { immediate: true });

onMounted(() => {
    document.addEventListener('click', onDocumentClick);
});

onUnmounted(() => {
    document.removeEventListener('click', onDocumentClick);
});
</script>

<style scoped>
.locator-fields-chevron {
    transition: transform 0.15s ease;
}

.locator-fields-open {
    transform: rotate(90deg);
}

.locator-color-chip {
    width: 0.85rem;
    height: 0.85rem;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.45);
    flex-shrink: 0;
}

.locator-color-menu {
    position: absolute;
    z-index: 5;
    left: 0;
    right: 0;
    margin-top: 0.25rem;
    max-height: 14rem;
    overflow: auto;
    border-radius: 0.25rem;
    background: var(--cloudtak-surface-bg, rgba(20, 20, 25, 0.96));
    color: var(--cloudtak-surface-color, rgba(255, 255, 255, 0.92));
    border: 1px solid var(--cloudtak-surface-border, rgba(255, 255, 255, 0.14));
}

.locator-color-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.4rem 0.75rem;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
}

.locator-color-option:hover,
.locator-color-option[aria-selected='true'] {
    background: rgba(255, 255, 255, 0.08);
}
</style>
