import { normalize_geojson } from '@tak-ps/node-cot/normalize_geojson';
import type { Feature } from 'geojson';

type MapWorkerDb = {
    add(feature: unknown, opts?: { authored?: boolean }): Promise<unknown>;
};

/**
 * Normalize an authored GeoJSON feature and keep Point CoT type (e.g. a-h-G).
 * Does not write to the map or a mission.
 */
export async function normalizeAuthoredGeoJsonFeature(
    feat: Feature,
    stableId: string,
): Promise<Feature> {
    const origProps = (feat.properties ?? {}) as Record<string, unknown>;
    const cotType = typeof origProps.type === 'string' ? origProps.type : undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const norm = await normalize_geojson({ ...feat, id: stableId } as any) as Feature;
    norm.properties = norm.properties ?? {};
    norm.properties.id = stableId;

    if (feat.geometry?.type === 'Point') {
        for (const key of ['type', 'how', 'icon'] as const) {
            if (typeof origProps[key] === 'string') {
                norm.properties[key] = origProps[key];
            }
        }
        if (cotType) {
            norm.properties.type = cotType;
        }
    }

    if (feat.geometry?.type === 'LineString') {
        for (const key of ['stroke', 'stroke-width', 'stroke-opacity'] as const) {
            if (origProps[key] !== undefined) {
                norm.properties[key] = origProps[key];
            }
        }
    }

    return norm;
}

/**
 * Import or update an authored GeoJSON feature on the active mission when one is open.
 * Preserves Point CoT type (e.g. a-h-G) after normalize_geojson.
 */
export async function importAuthoredGeoJsonFeature(
    mapWorkerDb: MapWorkerDb,
    feat: Feature,
    stableId: string,
): Promise<void> {
    const norm = await normalizeAuthoredGeoJsonFeature(feat, stableId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await mapWorkerDb.add(norm as any, { authored: true });
}
