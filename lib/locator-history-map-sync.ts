import type { Pinia } from 'pinia';
import type { Feature, FeatureCollection } from 'geojson';
import { useMapStore } from '@/stores/map.ts';
import Overlay from '@/base/overlay-class.ts';
import OverlayManager from '@/base/overlay.ts';
import { listHistory, listLocators } from '../api/tak-portal-client.ts';
import { useLocatorStore } from '../stores/plugin-state.ts';
import type { HistoryEntry, Locator } from './types.ts';
import {
    locationHistoryGeoJsonFeatures,
    type LocationHistoryPointMeta,
    type LocationHistoryPosition,
} from './location-history.ts';
import {
    importAuthoredGeoJsonFeature,
    normalizeAuthoredGeoJsonFeature,
} from './locator-map-import.ts';

const POLL_INTERVAL_MS = 15_000;
const FEATURE_PREFIX = 'locator-plugin';

/** Internal GeoJSON overlay. -1 is CloudTAK Map Features. */
export const LOCATOR_HISTORY_OVERLAY_ID = -2;
const LOCATOR_HISTORY_OVERLAY_NAME = 'Locator history';

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

type DrawnFeature = {
    id: string;
    feature: Feature;
};

function featuresForLocator(locator: Locator, history: HistoryEntry[]): DrawnFeature[] {
    const { positions, meta } = historyToTrack(history);
    if (positions.length === 0) return [];

    const latest = history.find((e) => e.latitude != null && e.longitude != null);
    const remarks = buildRemarks(locator, latest);
    const features = locationHistoryGeoJsonFeatures(positions, meta, {
        callsign: locator.title,
        remarks,
        startTime: meta[0]?.timestamp,
        endTime: meta[meta.length - 1]?.timestamp,
    });

    const { pointId, trailId } = locatorMapFeatureIds(locator.id);
    return features.map((feat) => {
        const stableId = feat.geometry.type === 'LineString' ? trailId : pointId;
        const feature: Feature = feat.geometry.type === 'LineString'
            ? {
                type: 'Feature',
                id: stableId,
                properties: feat.properties,
                geometry: {
                    type: 'LineString',
                    coordinates: feat.geometry.coordinates as LocationHistoryPosition[],
                },
            }
            : {
                type: 'Feature',
                id: stableId,
                properties: feat.properties,
                geometry: {
                    type: 'Point',
                    coordinates: feat.geometry.coordinates as LocationHistoryPosition,
                },
            };
        return { id: stableId, feature };
    });
}

function asOverlayFeature(norm: Feature): Feature {
    const properties = { ...(norm.properties ?? {}) };
    if (properties.stale instanceof Date) {
        properties.stale = properties.stale.toISOString();
    }
    if (norm.geometry?.type === 'Point' && typeof properties.type === 'string' && properties.icon == null) {
        properties.icon = properties.type;
    }
    return { ...norm, properties };
}

export class LocatorHistoryMapSync {
    private pinia: Pinia;
    private timer: ReturnType<typeof setInterval> | null = null;
    private closed = false;
    private syncing = false;
    private lastCoordsAt = new Map<string, string | null>();
    private lastDrawn = new Map<string, Feature[]>();

    constructor(pinia: Pinia) {
        this.pinia = pinia;
    }

    start(): void {
        if (this.timer) return;
        this.closed = false;
        void this.syncOnce();
        this.timer = setInterval(() => {
            void this.syncOnce();
        }, POLL_INTERVAL_MS);
    }

    stop(): void {
        this.closed = true;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.lastCoordsAt.clear();
        this.lastDrawn.clear();
        void this.removeOverlay();
    }

    async syncOnce(): Promise<void> {
        const store = useLocatorStore(this.pinia);
        if (!store.enabled || !store.showHistoryOnMap) {
            await this.removeOverlay();
            return;
        }
        if (this.syncing) return;
        this.syncing = true;
        try {
            const portalUrl = store.settings.takPortalUrl.trim();
            if (!portalUrl) {
                await this.setOverlayData([]);
                return;
            }

            const locators = await listLocators(portalUrl);
            if (!useLocatorStore(this.pinia).showHistoryOnMap) {
                await this.removeOverlay();
                return;
            }

            const active = locators.filter((l) => !l.archived && l.active !== false);
            const drawn: Feature[] = [];

            for (const locator of active) {
                const prevCoordsAt = this.lastCoordsAt.get(locator.id);
                const coordsAt = locator.lastCoordsAt ?? null;
                const needsHistory = coordsAt !== prevCoordsAt || !this.lastCoordsAt.has(locator.id);

                if (!locator.hasPositionPing && coordsAt == null) {
                    this.lastCoordsAt.delete(locator.id);
                    this.lastDrawn.delete(locator.id);
                    continue;
                }

                if (!needsHistory && !locator.hasPositionPing) {
                    const cached = this.lastDrawn.get(locator.id);
                    if (cached) drawn.push(...cached);
                    continue;
                }

                const history = await listHistory(portalUrl, locator.id);
                const overlayFeatures: Feature[] = [];
                for (const item of featuresForLocator(locator, history)) {
                    const norm = await normalizeAuthoredGeoJsonFeature(item.feature, item.id);
                    overlayFeatures.push(asOverlayFeature(norm));
                }
                this.lastDrawn.set(locator.id, overlayFeatures);
                this.lastCoordsAt.set(locator.id, coordsAt);
                drawn.push(...overlayFeatures);
            }

            const activeIds = new Set(active.map((l) => l.id));
            for (const id of this.lastCoordsAt.keys()) {
                if (!activeIds.has(id)) {
                    this.lastCoordsAt.delete(id);
                    this.lastDrawn.delete(id);
                }
            }

            if (!useLocatorStore(this.pinia).showHistoryOnMap) {
                await this.removeOverlay();
                return;
            }
            await this.setOverlayData(drawn);
        } catch (err) {
            console.warn('[locator-plugin] history map sync failed:', err);
        } finally {
            this.syncing = false;
            if (this.closed || !useLocatorStore(this.pinia).showHistoryOnMap) {
                await this.removeOverlay();
            }
        }
    }

    /**
     * Write this locator's current point and line into the active mission once.
     * The 15-second poll does not call this.
     */
    async postLocator(portalUrl: string, locator: Locator): Promise<void> {
        const mapStore = useMapStore(this.pinia);
        if (!mapStore.mission?.meta.guid) {
            throw new Error('No active mission. Open a DataSync mission before posting.');
        }

        const history = await listHistory(portalUrl, locator.id);
        const features = featuresForLocator(locator, history);
        if (features.length === 0) {
            throw new Error(`"${locator.title}" has no positions to post.`);
        }

        for (const item of features) {
            await importAuthoredGeoJsonFeature(mapStore.worker.db, item.feature, item.id);
        }
    }

    private async ensureOverlay(): Promise<Overlay | null> {
        const existing = OverlayManager.loadedFrom(LOCATOR_HISTORY_OVERLAY_ID);
        if (existing) return existing;

        const mapStore = useMapStore(this.pinia);
        if (!mapStore.isMapLoaded) return null;

        const overlay = await Overlay.internal({
            id: LOCATOR_HISTORY_OVERLAY_ID,
            name: LOCATOR_HISTORY_OVERLAY_NAME,
            type: 'geojson',
        });
        OverlayManager.appendLoaded(overlay);
        return overlay;
    }

    private async setOverlayData(features: Feature[]): Promise<void> {
        const overlay = await this.ensureOverlay();
        if (!overlay) return;

        const mapStore = useMapStore(this.pinia);
        if (!mapStore.isMapLoaded) return;

        const source = mapStore.map.getSource(String(LOCATOR_HISTORY_OVERLAY_ID));
        if (!source || source.type !== 'geojson' || !('setData' in source)) return;

        const collection: FeatureCollection = { type: 'FeatureCollection', features };
        await (source as { setData(data: FeatureCollection): Promise<void> }).setData(collection);
    }

    private async removeOverlay(): Promise<void> {
        const overlay = OverlayManager.loadedFrom(LOCATOR_HISTORY_OVERLAY_ID);
        if (!overlay) return;

        const mapStore = useMapStore(this.pinia);
        if (!mapStore.isMapLoaded) {
            const pos = OverlayManager.loaded.indexOf(overlay);
            if (pos !== -1) OverlayManager.loaded.splice(pos, 1);
            return;
        }

        try {
            await OverlayManager.deleteLoaded(overlay);
        } catch (err) {
            console.warn('[locator-plugin] history overlay remove failed:', err);
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
