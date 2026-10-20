import assert from 'node:assert/strict';
import test from 'node:test';
import {
    addLocateField,
    applyFieldType,
    collectLocateFields,
    defaultLocateFields,
    typeLabelsFor,
} from './locate-form.ts';

test('starts with optional name fields and the custom message label', () => {
    const rows = defaultLocateFields();
    const collected = collectLocateFields(rows);
    assert.equal(collected.ok, true);
    if (!collected.ok) return;
    assert.deepEqual(collected.fields, [
        { type: 'firstName', label: 'First Name', required: false },
        { type: 'lastName', label: 'Last Name', required: false },
        { type: 'message', label: 'Important Information to help you', required: false },
    ]);
});

test('hides a name type that another row already uses', () => {
    const rows = defaultLocateFields();
    const labels = typeLabelsFor(rows, rows[2]);
    assert.equal(labels.includes('First Name'), false);
    assert.equal(labels.includes('Message'), true);
    assert.equal(labels.includes('Text'), true);
    assert.equal(labels.includes('Choice'), true);
});

test('keeps a custom label when the type changes', () => {
    const rows = defaultLocateFields();
    rows[0].label = 'Given name';
    applyFieldType(rows[0], 'Text');
    assert.equal(rows[0].type, 'text');
    assert.equal(rows[0].label, 'Given name');
});

test('adds a text field and rejects a choice with no options', () => {
    const rows = addLocateField(defaultLocateFields());
    applyFieldType(rows[3], 'Choice');
    const collected = collectLocateFields(rows);
    assert.equal(collected.ok, false);
});
