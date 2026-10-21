import assert from 'node:assert/strict';
import test from 'node:test';
import {
    addLocateField,
    applyFieldType,
    collectLocateFields,
    defaultLocateFields,
    typeLabelsFor,
} from './locate-form.ts';

test('starts with no questions', () => {
    const collected = collectLocateFields(defaultLocateFields());
    assert.equal(collected.ok, true);
    if (!collected.ok) return;
    assert.deepEqual(collected.fields, []);
});

test('includes a name or message only after it is added', () => {
    let rows = addLocateField([]);
    applyFieldType(rows[0], 'First Name');
    rows = addLocateField(rows);
    applyFieldType(rows[1], 'Last Name');
    rows = addLocateField(rows);
    applyFieldType(rows[2], 'Message');
    const collected = collectLocateFields(rows);
    assert.equal(collected.ok, true);
    if (!collected.ok) return;
    assert.deepEqual(collected.fields, [
        { type: 'firstName', label: 'First Name', required: false },
        { type: 'lastName', label: 'Last Name', required: false },
        { type: 'message', label: 'Important Information to help you', required: false },
    ]);
    const labels = typeLabelsFor(rows, rows[2]);
    assert.equal(labels.includes('First Name'), false);
    assert.equal(labels.includes('Message'), true);
});

test('keeps a custom label when the type changes', () => {
    const rows = addLocateField([]);
    rows[0].label = 'Given name';
    applyFieldType(rows[0], 'First Name');
    assert.equal(rows[0].type, 'firstName');
    assert.equal(rows[0].label, 'Given name');
});

test('rejects a choice with no options', () => {
    const rows = addLocateField([]);
    applyFieldType(rows[0], 'Choice');
    const collected = collectLocateFields(rows);
    assert.equal(collected.ok, false);
});
