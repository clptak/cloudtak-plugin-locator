export type ParsePhoneResult =
    | { phones: string[] }
    | { error: string };

/** Comma/semicolon-separated phone strings → E.164-like list or error. */
export function parsePhoneList(raw: string): ParsePhoneResult {
    const s = String(raw || '').trim();
    if (!s) return { error: 'Enter at least one phone number.' };

    const parts = s
        .split(/[;,]/g)
        .map((x) => String(x).trim())
        .filter(Boolean);

    if (!parts.length) return { error: 'Enter at least one phone number.' };

    const seen = new Set<string>();
    const phones: string[] = [];

    for (const p of parts) {
        const digits = p.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 15) {
            return { error: `Invalid phone number: ${p}` };
        }

        let e164: string;
        if (digits.length === 10) {
            e164 = '+1' + digits;
        } else if (digits.length === 11 && digits[0] === '1') {
            e164 = '+' + digits;
        } else {
            e164 = '+' + digits;
        }

        if (seen.has(e164)) continue;
        seen.add(e164);
        phones.push(e164);
    }

    if (!phones.length) return { error: 'Enter at least one phone number.' };
    return { phones };
}
