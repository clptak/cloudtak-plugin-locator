/** Hostile ground point — only the most recent location in a history. */
export const LOCATION_HISTORY_POINT_TYPE = 'a-h-G';

/** Magenta trail rgb(255, 0, 255). */
export const LOCATION_HISTORY_STROKE = '#ff00ff';

export type LocationHistoryPosition = [number, number, number];

export interface LocationHistoryPointMeta {
    timestamp?: string;
    gpsAltitude?: number;
    heightAboveTakeoff?: number;
    hybridAltitude?: number;
}

export interface LocationHistoryGeoJsonOptions {
    callsign: string;
    remarks: string;
    startTime?: string;
    endTime?: string;
    elevationSource?: string;
    takeoffMslMeters?: number;
}

/** UTC HHMM from an ISO timestamp. */
export function formatReceivedHhmm(timestamp: string | undefined): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hh}${mm}`;
}

export function callsignWithReceivedHhmm(callsign: string, timestamp: string | undefined): string {
    const hhmm = formatReceivedHhmm(timestamp);
    return hhmm ? `${callsign} ${hhmm}` : callsign;
}

/**
 * Latest fix → a-h-G Point; 2+ fixes → magenta LineString (full history) + same Point.
 * Line terminal vertex === Point coordinate (no gap).
 */
export function locationHistoryGeoJsonFeatures(
    positions: LocationHistoryPosition[],
    pointMeta: LocationHistoryPointMeta[],
    opts: LocationHistoryGeoJsonOptions,
): Array<{
    type: 'Feature';
    geometry: { type: 'Point' | 'LineString'; coordinates: LocationHistoryPosition | LocationHistoryPosition[] };
    properties: Record<string, unknown>;
}> {
    if (positions.length === 0) return [];

    const features: Array<{
        type: 'Feature';
        geometry: { type: 'Point' | 'LineString'; coordinates: LocationHistoryPosition | LocationHistoryPosition[] };
        properties: Record<string, unknown>;
    }> = [];

    const lastIndex = positions.length - 1;
    const lastPosition = positions[lastIndex];
    const lastMeta = pointMeta[lastIndex] ?? {};
    const displayCallsign = callsignWithReceivedHhmm(opts.callsign, lastMeta.timestamp);

    if (positions.length > 1) {
        features.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: positions,
            },
            properties: {
                callsign: displayCallsign,
                remarks: opts.remarks,
                pointCount: positions.length,
                stroke: LOCATION_HISTORY_STROKE,
                'stroke-width': 2,
                'stroke-opacity': 1,
                startTime: opts.startTime,
                endTime: opts.endTime,
                elevationSource: opts.elevationSource,
                takeoffMslMeters: opts.takeoffMslMeters,
            },
        });
    }

    features.push({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: lastPosition,
        },
        properties: {
            callsign: displayCallsign,
            remarks: opts.remarks,
            type: LOCATION_HISTORY_POINT_TYPE,
            pointIndex: lastIndex,
            timestamp: lastMeta.timestamp,
            gpsAltitude: lastMeta.gpsAltitude,
            heightAboveTakeoff: lastMeta.heightAboveTakeoff,
            hybridAltitude: lastMeta.hybridAltitude,
        },
    });

    return features;
}

export class LocationHistoryTracker {
    private positions = new Map<string, LocationHistoryPosition[]>();
    private meta = new Map<string, LocationHistoryPointMeta[]>();

    push(
        key: string,
        position: LocationHistoryPosition,
        pointMeta: LocationHistoryPointMeta,
        opts: Omit<LocationHistoryGeoJsonOptions, 'startTime' | 'endTime'>,
    ) {
        const positions = [...(this.positions.get(key) ?? []), position];
        const metas = [...(this.meta.get(key) ?? []), pointMeta];
        this.positions.set(key, positions);
        this.meta.set(key, metas);
        return locationHistoryGeoJsonFeatures(positions, metas, {
            ...opts,
            startTime: metas[0]?.timestamp,
            endTime: metas[metas.length - 1]?.timestamp,
        });
    }

    clear(key: string): void {
        this.positions.delete(key);
        this.meta.delete(key);
    }
}
