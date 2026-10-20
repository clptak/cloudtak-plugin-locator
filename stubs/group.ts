/** Typecheck stub; runtime uses CloudTAK @/base/group.ts */
type GroupChannel = { name: string };

export default class GroupManager {
    static async hydrated(): Promise<Date | null> {
        return null;
    }

    static async list(): Promise<GroupChannel[]> {
        return [];
    }
}
