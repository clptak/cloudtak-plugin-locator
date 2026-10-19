<template>
    <div :class='rootClass'>
        <TablerBorder
            class='cloudtak-accent text-white'
            :fill-height='false'
            :shadow='false'
            gap='sm'
        >
            <template #label>
                <div class='d-flex align-items-center gap-2'>
                    <p class='text-uppercase text-white-50 small mb-0'>
                        {{ title }}
                    </p>
                    <span
                        v-if='locators.length'
                        class='text-white-50 small'
                    >
                        ({{ locators.length }})
                    </span>
                </div>
            </template>

            <div
                v-if='!locators.length'
                class='text-muted'
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
                    class='border-bottom border-light py-3'
                >
                    <div class='d-flex justify-content-between align-items-start gap-2'>
                        <div class='min-width-0'>
                            <div class='fw-semibold text-white'>
                                {{ loc.title }}
                            </div>
                            <div class='text-white-50 small text-break'>
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
                    <div class='text-white-50 small mt-2'>
                        Ping: {{ formatInterval(loc.pingIntervalSeconds) }}
                        · Last: {{ formatLastUpdate(loc) }}
                    </div>
                    <LocatorRowActions
                        class='mt-2'
                        :locator='loc'
                        :tak-portal-url='takPortalUrl'
                        :archived='archived'
                        :can-post-data-sync='canPostDataSync'
                        :posting='postingId === loc.id'
                        @send-sms='emit("send-sms", $event)'
                        @manual-ping='emit("manual-ping", $event)'
                        @history='emit("history", $event)'
                        @post-data-sync='emit("post-data-sync", $event)'
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
                <table class='table table-vcenter mb-0'>
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
                                <div class='fw-semibold'>
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
                                    :can-post-data-sync='canPostDataSync'
                                    :posting='postingId === loc.id'
                                    @send-sms='emit("send-sms", $event)'
                                    @manual-ping='emit("manual-ping", $event)'
                                    @history='emit("history", $event)'
                                    @post-data-sync='emit("post-data-sync", $event)'
                                    @archive='emit("archive", $event)'
                                    @reactivate='emit("reactivate", $event)'
                                    @delete='emit("delete", $event)'
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </TablerBorder>
    </div>
</template>

<script setup lang='ts'>
import { computed } from 'vue';
import { TablerBorder } from '@tak-ps/vue-tabler';
import { useAppStore } from '@/stores/app.ts';
import type { Locator } from '../lib/types.ts';
import LocatorRowActions from './LocatorRowActions.vue';

withDefaults(defineProps<{
    title: string;
    locators: Locator[];
    takPortalUrl: string;
    archived?: boolean;
    rootClass?: string;
    canPostDataSync?: boolean;
    postingId?: string;
}>(), {
    archived: false,
    rootClass: '',
    canPostDataSync: false,
    postingId: '',
});

const emit = defineEmits<{
    'send-sms': [locator: Locator];
    'manual-ping': [locator: Locator];
    history: [locator: Locator];
    'post-data-sync': [locator: Locator];
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
