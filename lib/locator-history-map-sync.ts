import type { Pinia } from 'pinia';
import { useMapStore } from '../../../src/stores/map.ts';
import { listHistory, listLocators } from '../api/tak-portal-client.ts';
import { useLocatorStore } from '../stores/plugin-state.ts';
import type { HistoryEntry, Locator } from './types.ts';
import {
    locationHistoryGeoJsonFeatures,
    type LocationHistoryPointMeta,
    type LocationHistoryPosition,
} from './location-history.ts';
import { importAuthoredGeoJsonFeature } from './locator-map-import.ts';

const POLL_INTERVAL_MS = 15_000;
const FEATURE_PREFIX = 'locator-plugin';

export function locatorMapFeatureIds(locatorId: string): { pointId: string; trailId: string } {
    return {
        pointId: `${FEATURE_PREFIX}-${locatorId}-point`,
        trailId: `${FEATURE_PREFIX}-${locatorId}-trail`,
    };
}

function historyToTrack(
    entries: HistoryEntry[],
): { positions: LocationHistoryPosition[]; meta: LocationHistoryPointMeta[] } {
    const withCoords = entries
        .filter((e) => e.latitude != null && e.longitude != null)
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    const positions: LocationHistoryPosition[] = withCoords.map((e) => [
        e.longitude!,
        e.latitude!,
        0,
    ]);
    const meta: LocationHistoryPointMeta[] = withCoords.map((e) => ({ timestamp: e.at }));

    return { positions, meta };
}

function buildRemarks(locator: Locator, latest: HistoryEntry | undefined): string {
    const parts: string[] = [`SMS locator ${locator.slug}`];
    if (latest?.accuracyMeters != null) {
        parts.push(`±${Math.round(latest.accuracyMeters)}m`);
    }
    if (latest?.remarks?.trim()) {
        parts.push(latest.remarks.trim());
    }
    return parts.join(' · ');
}

export class LocatorHistoryMapSync {
    private pinia: Pinia;
    private timer: ReturnType<typeof setInterval> | null = null;
    private syncing = false;
    private lastCoordsAt = new Map<string, string | null>();

    constructor(pinia: Pinia) {
        this.pinia = pinia;
    }

    start(): void {
        if (this.timer) return;
        void this.syncOnce();
        this.timer = setInterval(() => {
            void this.syncOnce();
        }, POLL_INTERVAL_MS);
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.lastCoordsAt.clear();
    }

    async syncOnce(): Promise<void> {
        if (this.syncing) return;
        this.syncing = true;
        try {
            const store = useLocatorStore(this.pinia);
            const portalUrl = store.settings.takPortalUrl.trim();
            if (!portalUrl || !store.enabled) return;

            const locators = await listLocators(portalUrl);
            const active = locators.filter((l) => !l.archived && l.active !== false);

            for (const locator of active) {
                const prevCoordsAt = this.lastCoordsAt.get(locator.id);
                const coordsAt = locator.lastCoordsAt ?? null;
                const needsHistory = coordsAt !== prevCoordsAt || !this.lastCoordsAt.has(locator.id);

                if (!needsHistory && !locator.hasPositionPing) continue;
                if (!locator.hasPositionPing && coordsAt == null) continue;

                await this.syncLocator(portalUrl, locator);
                this.lastCoordsAt.set(locator.id, coordsAt);
            }

            const activeIds = new Set(active.map((l) => l.id));
            for (const id of this.lastCoordsAt.keys()) {
                if (!activeIds.has(id)) {
                    this.lastCoordsAt.delete(id);
                }
            }
        } catch (err) {
            console.warn('[locator-plugin] history map sync failed:', err);
        } finally {
            this.syncing = false;
        }
    }

    private async syncLocator(portalUrl: string, locator: Locator): Promise<void> {
        const history = await listHistory(portalUrl, locator.id);
        const { positions, meta } = historyToTrack(history);
        if (positions.length === 0) return;

        const latest = history.find((e) => e.latitude != null && e.longitude != null);
        const remarks = buildRemarks(locator, latest);
        const features = locationHistoryGeoJsonFeatures(positions, meta, {
            callsign: locator.title,
            remarks,
            startTime: meta[0]?.timestamp,
            endTime: meta[meta.length - 1]?.timestamp,
        });

        const { pointId, trailId } = locatorMapFeatureIds(locator.id);
        const mapStore = useMapStore(this.pinia);

        for (const feat of features) {
            const stableId = feat.geometry.type === 'LineString' ? trailId : pointId;
            if (feat.geometry.type === 'LineString') {
                await importAuthoredGeoJsonFeature(mapStore.worker.db, {
                    type: 'Feature',
                    id: stableId,
                    properties: feat.properties,
                    geometry: {
                        type: 'LineString',
                        coordinates: feat.geometry.coordinates as LocationHistoryPosition[],
                    },
                }, stableId);
            } else {
                await importAuthoredGeoJsonFeature(mapStore.worker.db, {
                    type: 'Feature',
                    id: stableId,
                    properties: feat.properties,
                    geometry: {
                        type: 'Point',
                        coordinates: feat.geometry.coordinates as LocationHistoryPosition,
                    },
                }, stableId);
            }
        }
    }
}

let activeSync: LocatorHistoryMapSync | null = null;

export function setLocatorHistoryMapSync(sync: LocatorHistoryMapSync | null): void {
    activeSync = sync;
}

export function getLocatorHistoryMapSync(): LocatorHistoryMapSync | null {
    return activeSync;
}
