/** Typecheck stub; runtime uses CloudTAK @/stores/map.ts */

type MissionLayerStub = {
    uid: string;
    name?: string;
    type?: string;
    mission_layers?: MissionLayerStub[];
};

export function useMapStore(_pinia?: unknown): {
    mission?: {
        meta: { guid: string };
        layer: {
            list(opts?: { refresh?: boolean }): Promise<MissionLayerStub[]>;
            create(body: { name: string; type: 'UID' }): Promise<MissionLayerStub>;
            attachFeatures(layerUid: string, uids: string[]): Promise<void>;
        };
    };
    worker: {
        db: {
            add(feature: unknown, opts: { authored?: boolean }): Promise<{ id?: string } | undefined>;
        };
    };
} {
    void _pinia;
    throw new Error('stub');
}
