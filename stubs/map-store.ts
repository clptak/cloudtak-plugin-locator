/** Typecheck stub; runtime uses CloudTAK @/stores/map.ts */
export function useMapStore(_pinia?: unknown): {
    mission?: { meta: { guid: string } };
    worker: {
        db: {
            add(feature: unknown, opts: { authored?: boolean }): Promise<{ id?: string } | undefined>;
        };
    };
} {
    void _pinia;
    throw new Error('stub');
}
