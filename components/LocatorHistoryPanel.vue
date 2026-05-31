<template>
    <div
        class='modal modal-blur show d-block'
        tabindex='-1'
        role='dialog'
        @click.self='emit("close")'
    >
        <div
            class='modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable'
            role='document'
        >
            <div class='modal-content'>
                <div class='modal-header'>
                    <h5 class='modal-title'>
                        Locator history — {{ locator.title }}
                    </h5>
                    <button
                        type='button'
                        class='btn-close'
                        aria-label='Close'
                        @click='emit("close")'
                    />
                </div>
                <div class='modal-body'>
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
                </div>
                <div class='modal-footer'>
                    <button
                        type='button'
                        class='btn btn-secondary'
                        @click='emit("close")'
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>
    <div class='modal-backdrop fade show' />
</template>

<script setup lang='ts'>
import { TablerLoading, TablerAlert } from '@tak-ps/vue-tabler';
import type { HistoryEntry, Locator } from '../lib/types.ts';

defineProps<{
    locator: Locator;
    entries: HistoryEntry[];
    loading?: boolean;
    error?: Error;
}>();

const emit = defineEmits<{
    close: [];
}>();

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
