/** Typecheck stub; runtime uses CloudTAK @/base/overlay-class.ts */

export default class Overlay {
    id: number;

    constructor(id: number) {
        this.id = id;
    }

    static async internal(body: { id: number; name: string; type: string }): Promise<Overlay> {
        return new Overlay(body.id);
    }
}
