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
                    v-else-if='isMobile'
                    class='d-flex flex-column gap-0'
                >
                    <div
                        v-for='loc in locators'
                        :key='loc.id'
                        class='border-bottom p-3'
                    >
                        <div class='d-flex justify-content-between align-items-start gap-2'>
                            <div class='min-width-0'>
                                <div class='fw-medium'>
                                    {{ loc.title }}
                                </div>
                                <div class='text-muted small text-break'>
                                    {{ loc.slug }}
                                </div>
                            </div>
                            <span
                                class='badge flex-shrink-0'
                                :class='statusBadgeClass(loc)'
                            >
                                {{ statusLabel(loc) }}
                            </span>
                        </div>
                        <div class='text-muted small mt-2'>
                            Ping: {{ formatInterval(loc.pingIntervalSeconds) }}
                            · Last: {{ formatLastUpdate(loc) }}
                        </div>
                        <LocatorRowActions
                            class='mt-2'
                            :locator='loc'
                            :tak-portal-url='takPortalUrl'
                            :archived='archived'
                            @send-sms='emit("send-sms", $event)'
                            @manual-ping='emit("manual-ping", $event)'
                            @history='emit("history", $event)'
                            @archive='emit("archive", $event)'
                            @reactivate='emit("reactivate", $event)'
                            @delete='emit("delete", $event)'
                        />
                    </div>
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
                                    <LocatorRowActions
                                        :locator='loc'
                                        :tak-portal-url='takPortalUrl'
                                        :archived='archived'
                                        @send-sms='emit("send-sms", $event)'
                                        @manual-ping='emit("manual-ping", $event)'
                                        @history='emit("history", $event)'
                                        @archive='emit("archive", $event)'
                                        @reactivate='emit("reactivate", $event)'
                                        @delete='emit("delete", $event)'
                                    />
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
import { computed } from 'vue';
import { useAppStore } from '@/stores/app.ts';
import type { Locator } from '../lib/types.ts';
import LocatorRowActions from './LocatorRowActions.vue';

defineProps<{
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

const appStore = useAppStore();
const isMobile = computed(() => appStore.isMobileDetected);

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
</script>
