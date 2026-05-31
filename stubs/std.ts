/** Typecheck stub; runtime uses CloudTAK @/std.ts */
export async function std(
    url: string | URL,
    opts?: {
        token?: string;
        headers?: Record<string, string>;
        body?: unknown;
        method?: string;
    },
): Promise<unknown> {
    void url;
    void opts;
    return {};
}
