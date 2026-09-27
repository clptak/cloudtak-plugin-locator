/** Typecheck stub; runtime uses CloudTAK @/std.ts */
export function stdurl(url: string | URL): URL {
    return typeof url === 'string' ? new URL(url, 'http://localhost') : url;
}

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
