import assert from 'node:assert/strict';
import test from 'node:test';
import { accessFromSavedChannels } from './portal-access.ts';

const saved = { channel: 'CCSO Locator', takPortalUrl: 'https://takportal.example' };
const unavailable = 'unavailable';

test('opens the form when the local channel cache is not ready', () => {
    const result = accessFromSavedChannels(saved, null, unavailable);
    assert.equal(result.ok, true);
});

test('opens the form when the saved channel is in the local list', () => {
    const result = accessFromSavedChannels(saved, ['Other', 'CCSO Locator'], unavailable);
    assert.equal(result.ok, true);
});

test('keeps the form closed when the local list does not include the saved channel', () => {
    const result = accessFromSavedChannels(saved, ['Other'], unavailable);
    assert.equal(result.ok, false);
});
