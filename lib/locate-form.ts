/** Questions shown on the TAK Portal public locate page. */

export const LOCATE_FIELD_TYPES = [
    { type: 'firstName', label: 'First Name' },
    { type: 'lastName', label: 'Last Name' },
    { type: 'message', label: 'Message' },
    { type: 'text', label: 'Text' },
    { type: 'choice', label: 'Choice' },
] as const;

export const MESSAGE_LABEL = 'Important Information to help you';

const ONCE = new Set(['firstName', 'lastName', 'message']);
const MAX_FIELDS = 40;

export type LocateFieldType = (typeof LOCATE_FIELD_TYPES)[number]['type'];

export type LocateFieldDraft = {
    key: number;
    type: LocateFieldType;
    label: string;
    required: boolean;
    options: string;
};

export type LocateFieldPayload = {
    type: LocateFieldType;
    label: string;
    required: boolean;
    options?: string[];
};

let nextKey = 1;

function draft(type: LocateFieldType, label: string, required: boolean): LocateFieldDraft {
    nextKey += 1;
    return { key: nextKey, type, label, required, options: '' };
}

export function defaultLocateFields(): LocateFieldDraft[] {
    return [];
}

export function addLocateField(rows: LocateFieldDraft[]): LocateFieldDraft[] {
    if (rows.length >= MAX_FIELDS) return rows;
    return [...rows, draft('text', 'Text', false)];
}

export function typeMenuLabel(type: LocateFieldType): string {
    return LOCATE_FIELD_TYPES.find((item) => item.type === type)?.label || 'Text';
}

export function labelForType(type: LocateFieldType): string {
    if (type === 'message') return MESSAGE_LABEL;
    return LOCATE_FIELD_TYPES.find((item) => item.type === type)?.label || 'Text';
}

export function typeLabelsFor(rows: LocateFieldDraft[], row: LocateFieldDraft): string[] {
    const used = new Set(
        rows
            .filter((item) => item.key !== row.key && ONCE.has(item.type))
            .map((item) => item.type),
    );
    return LOCATE_FIELD_TYPES
        .filter((item) => !used.has(item.type))
        .map((item) => item.label);
}

export function applyFieldType(row: LocateFieldDraft, typeLabel: string): void {
    const next = LOCATE_FIELD_TYPES.find((item) => item.label === typeLabel);
    if (!next || next.type === row.type) return;
    const previousDefault = labelForType(row.type);
    row.type = next.type;
    if (!row.label.trim() || row.label === previousDefault) {
        row.label = labelForType(next.type);
    }
}

export function collectLocateFields(
    rows: LocateFieldDraft[],
): { ok: true; fields: LocateFieldPayload[] } | { ok: false; error: string } {
    const fields: LocateFieldPayload[] = [];
    for (const row of rows.slice(0, MAX_FIELDS)) {
        const label = row.label.trim().slice(0, 80) || labelForType(row.type);
        if (row.type === 'choice') {
            const options = row.options
                .split(',')
                .map((item) => item.trim().slice(0, 120))
                .filter(Boolean)
                .slice(0, 24);
            if (!options.length) {
                return { ok: false, error: 'A Choice field needs at least one option.' };
            }
            fields.push({ type: row.type, label, required: row.required, options });
            continue;
        }
        fields.push({ type: row.type, label, required: row.required });
    }
    return { ok: true, fields };
}
