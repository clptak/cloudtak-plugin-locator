/** Typecheck stub; runtime uses CloudTAK @/base/overlay.ts */
import Overlay from './overlay-class.ts';

export default class OverlayManager {
    static loaded: Overlay[] = [];

    static loadedFrom(id: number): Overlay | undefined {
        return this.loaded.find((overlay) => overlay.id === id);
    }

    static appendLoaded(...overlays: Overlay[]): void {
        this.loaded.push(...overlays);
    }

    static async deleteLoaded(idOrOverlay: number | Overlay): Promise<void> {
        void idOrOverlay;
    }
}
