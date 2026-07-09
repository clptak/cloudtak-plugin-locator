<template>
    <div class='py-3'>
        <p class='text-muted small mb-3'>
            {{ locator.title }}
            <span class='ms-1'>({{ locator.slug }})</span>
        </p>

        <TablerLoading
            v-if='loading'
            :compact='true'
            desc='Loading history…'
        />
        <TablerAlert
            v-else-if='error'
            :err='error'
        />
        <div
            v-else-if='!entries.length'
            class='text-muted'
        >
            No ping history yet.
        </div>
        <template v-else>
            <div
                v-if='isMobile'
                class='d-flex flex-column gap-3'
            >
                <div
                    v-for='row in entries'
                    :key='row.id'
                    class='card card-sm'
                >
                    <div class='card-body py-2 px-3'>
                        <div class='d-flex justify-content-between gap-2'>
                            <span class='fw-medium small'>{{ row.name || '—' }}</span>
                            <span class='text-muted small text-nowrap'>{{ formatTime(row.at) }}</span>
                        </div>
                        <div class='text-muted small mt-1'>
                            {{ formatPosition(row) }}
                        </div>
                        <div
                            v-if='row.remarks'
                            class='small mt-1'
                        >
                            {{ row.remarks }}
                        </div>
                    </div>
                </div>
            </div>
            <div
                v-else
                class='table-responsive'
            >
                <table class='table table-vcenter table-sm'>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Name</th>
                            <th>Position</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for='row in entries'
                            :key='row.id'
                        >
                            <td class='text-nowrap small'>
                                {{ formatTime(row.at) }}
                            </td>
                            <td class='small'>
                                {{ row.name || '—' }}
                            </td>
                            <td class='small text-muted'>
                                {{ formatPosition(row) }}
                            </td>
                            <td class='small'>
                                {{ row.remarks || '—' }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>
    </div>
</template>

<script setup lang='ts'>
import { computed } from 'vue';
import { TablerLoading, TablerAlert } from '@tak-ps/vue-tabler';
import { useAppStore } from '@/stores/app.ts';
import type { HistoryEntry, Locator } from '../lib/types.ts';

defineProps<{
    locator: Locator;
    entries: HistoryEntry[];
    loading?: boolean;
    error?: Error;
}>();

const appStore = useAppStore();
const isMobile = computed(() => appStore.isMobileDetected);

function formatTime(at: string): string {
    try {
        return new Date(at).toLocaleString();
    } catch {
        return at;
    }
}

function formatPosition(row: HistoryEntry): string {
    if (row.latitude == null || row.longitude == null) return '—';
    const acc = row.accuracyMeters != null
        ? ` ±${Math.round(row.accuracyMeters)}m`
        : '';
    return `${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)}${acc}`;
}
</script>
