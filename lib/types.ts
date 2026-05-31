export type Locator = {
    id: string;
    slug: string;
    title: string;
    pingIntervalSeconds: number;
    intervalEpoch: number;
    remotePingEpoch: number;
    active: boolean;
    archived: boolean;
    sharingStoppedByUser?: boolean;
    createdAt: string;
    updatedAt: string;
    lastPingAt?: string | null;
    lastCoordsAt?: string | null;
    lastLatitude?: number | null;
    lastLongitude?: number | null;
    lastAccuracyMeters?: number | null;
    hasPositionPing?: boolean;
};

export type HistoryEntry = {
    id: string;
    locatorId: string;
    at: string;
    latitude: number | null;
    longitude: number | null;
    accuracyMeters: number | null;
    name: string;
    remarks: string;
    kind: 'interval' | 'manual';
};

export type PluginSettings = {
    takPortalUrl: string;
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioFromNumber: string;
    twilioTestToNumber: string;
    rapidsosApiKey: string;
};

export type TwilioCredentials = {
    accountSid: string;
    authToken: string;
    fromNumber: string;
};
