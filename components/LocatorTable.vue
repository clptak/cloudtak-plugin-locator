<template>
    <div :class='rootClass'>
        <div class='card'>
            <div class='card-header d-flex align-items-center'>
                <div class='card-title mb-0'>
                    {{ title }}
                </div>
                <div
                    v-if='locators.length'
                    class='text-muted ms-2 small'
                >
                    ({{ locators.length }})
                </div>
            </div>
            <div class='card-body p-0'>
                <div
                    v-if='!locators.length'
                    class='p-3 text-muted'
                >
                    No locators in this list.
                </div>
                <div
                    v-else
                    class='table-responsive'
                >
                    <table class='table table-vcenter card-table mb-0'>
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Ping</th>
                                <th>Status</th>
                                <th>Last update</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for='loc in locators'
                                :key='loc.id'
                            >
                                <td>
                                    <div class='fw-medium'>
                                        {{ loc.title }}
                                    </div>
                                    <div class='text-muted small'>
                                        {{ loc.slug }}
                                    </div>
                                </td>
                                <td>
                                    {{ formatInterval(loc.pingIntervalSeconds) }}
                                </td>
                                <td>
                                    <span
                                        class='badge'
                                        :class='statusBadgeClass(loc)'
                                    >
                                        {{ statusLabel(loc) }}
                                    </span>
                                </td>
                                <td class='text-muted small'>
                                    {{ formatLastUpdate(loc) }}
                                </td>
                                <td>
                                    <div class='d-flex flex-wrap gap-1'>
                                        <template v-if='!archived'>
                                            <button
                                                type='button'
                                                class='btn btn-sm btn-primary'
                                                @click='emit("send-sms", loc)'
                                            >
                                                Send SMS
                                            </button>
                                            <button
                                                type='button'
                                                class='btn btn-sm btn-secondary'
                                                @click='emit("manual-ping", loc)'
                                            >
                                                Manual ping
                                            </button>
                                            <button
                                                type='button'
                                                class='btn btn-sm btn-secondary'
                                                @click='emit("history", loc)'
                                            >
                                                History
                                            </button>
                                            <a
                                                class='btn btn-sm btn-outline-secondary'
                                                :href='publicUrl(loc)'
                                                target='_blank'
                                                rel='noopener noreferrer'
                                            >
                                                Link
                                            </a>
                                            <button
                                                type='button'
                                                class='btn btn-sm btn-outline-secondary'
                                                @click='emit("archive", loc)'
                                            >
                                                Archive
                                            </button>
                                        </template>
                                        <template v-else>
                                            <button
                                                type='button'
                                                class='btn btn-sm btn-secondary'
                                                @click='emit("reactivate", loc)'
                                            >
                                                Reactivate
                                            </button>
                                        </template>
                                        <button
                                            type='button'
                                            class='btn btn-sm btn-outline-danger'
                                            @click='emit("delete", loc)'
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang='ts'>
import type { Locator } from '../lib/types.ts';
import { publicLocateUrl } from '../lib/locator-url.ts';

const props = defineProps<{
    title: string;
    locators: Locator[];
    takPortalUrl: string;
    archived?: boolean;
    rootClass?: string;
}>();

const emit = defineEmits<{
    'send-sms': [locator: Locator];
    'manual-ping': [locator: Locator];
    history: [locator: Locator];
    archive: [locator: Locator];
    reactivate: [locator: Locator];
    delete: [locator: Locator];
}>();

function formatInterval(seconds: number): string {
    if (seconds === 0) return 'One-time';
    return `${seconds}s`;
}

function statusLabel(loc: Locator): string {
    if (loc.archived) return 'Archived';
    if (!loc.active) return 'Inactive';
    if (loc.sharingStoppedByUser) return 'Stopped';
    return 'Active';
}

function statusBadgeClass(loc: Locator): string {
    if (loc.archived || !loc.active) return 'bg-secondary';
    if (loc.sharingStoppedByUser) return 'bg-yellow';
    return 'bg-green';
}

function formatLastUpdate(loc: Locator): string {
    const at = loc.lastPingAt || loc.lastCoordsAt || loc.updatedAt;
    if (!at) return '—';
    try {
        return new Date(at).toLocaleString();
    } catch {
        return at;
    }
}

function publicUrl(loc: Locator): string {
    return publicLocateUrl(props.takPortalUrl, loc.slug);
}
</script>
