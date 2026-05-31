import { std } from '../../../src/std.ts';
import { parsePhoneList } from '../lib/phone.ts';
import type { TwilioCredentials } from '../lib/types.ts';

type ProxyResponse = {
    status: number;
    headers?: Record<string, string>;
    body: unknown;
};

function twilioBasicAuth(accountSid: string, authToken: string): string {
    const encoded = btoa(`${accountSid}:${authToken}`);
    return `Basic ${encoded}`;
}

function twilioMessagesUrl(accountSid: string): string {
    return `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
}

function formatTwilioError(body: unknown, status: number): string {
    if (body && typeof body === 'object' && 'message' in body) {
        return String((body as { message: string }).message);
    }
    if (typeof body === 'string' && body.trim()) return body.slice(0, 500);
    return `Twilio request failed (HTTP ${status})`;
}

export async function sendTwilioSms(
    creds: TwilioCredentials,
    toE164: string,
    bodyText: string,
): Promise<void> {
    const accountSid = creds.accountSid.trim();
    const authToken = creds.authToken.trim();
    const from = creds.fromNumber.trim();

    if (!accountSid || !authToken || !from) {
        throw new Error('Configure Twilio Account SID, Auth Token, and From Number in Settings.');
    }

    const params = new URLSearchParams();
    params.set('To', toE164);
    params.set('From', from);
    params.set('Body', bodyText);

    const proxyRes = await std('/api/proxy', {
        method: 'POST',
        body: {
            url: twilioMessagesUrl(accountSid),
            method: 'POST',
            headers: {
                Authorization: twilioBasicAuth(accountSid, authToken),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        },
    }) as ProxyResponse;

    if (proxyRes.status < 200 || proxyRes.status >= 300) {
        throw new Error(formatTwilioError(proxyRes.body, proxyRes.status));
    }
}

export async function sendTwilioSmsToMany(
    creds: TwilioCredentials,
    rawPhones: string,
    bodyText: string,
): Promise<number> {
    const parsed = parsePhoneList(rawPhones);
    if ('error' in parsed) throw new Error(parsed.error);

    for (const phone of parsed.phones) {
        await sendTwilioSms(creds, phone, bodyText);
    }

    return parsed.phones.length;
}

export async function sendTestSms(creds: TwilioCredentials, testToRaw: string): Promise<number> {
    return sendTwilioSmsToMany(creds, testToRaw, 'CloudTAK Locator - SMS test');
}
