const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;

function readU16(bytes: Uint8Array, offset: number): number {
    return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32(bytes: Uint8Array, offset: number): number {
    return (
        (bytes[offset]
            | (bytes[offset + 1] << 8)
            | (bytes[offset + 2] << 16)
            | (bytes[offset + 3] << 24)) >>> 0
    );
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
    const min = Math.max(0, bytes.length - 22 - 65535);
    for (let i = bytes.length - 22; i >= min; i--) {
        if (readU32(bytes, i) === END_OF_CENTRAL_DIRECTORY) return i;
    }
    return -1;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
    const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
}

/**
 * Pull a JSON file out of a TAK data package (a zip). A raw JSON body is returned as-is.
 */
export async function extractPackageJson(buffer: ArrayBuffer, preferredFileName: string): Promise<string> {
    const bytes = new Uint8Array(buffer);
    if (!bytes.length) {
        throw new Error('Locator package was empty.');
    }

    const first = String.fromCharCode(bytes[0]);
    if (first === '{' || first === '[') {
        return new TextDecoder().decode(bytes);
    }

    const eocd = findEndOfCentralDirectory(bytes);
    if (eocd < 0) {
        throw new Error('Locator package is not a zip file.');
    }

    const entryCount = readU16(bytes, eocd + 10);
    let offset = readU32(bytes, eocd + 16);
    const decoder = new TextDecoder();
    const jsonFiles: { name: string; text: string }[] = [];

    for (let i = 0; i < entryCount; i++) {
        if (offset + 46 > bytes.length || readU32(bytes, offset) !== CENTRAL_DIRECTORY) {
            throw new Error('Locator package zip directory is truncated.');
        }

        const method = readU16(bytes, offset + 10);
        const compSize = readU32(bytes, offset + 20);
        const nameLen = readU16(bytes, offset + 28);
        const extraLen = readU16(bytes, offset + 30);
        const commentLen = readU16(bytes, offset + 32);
        const localOffset = readU32(bytes, offset + 42);
        const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLen));
        offset += 46 + nameLen + extraLen + commentLen;

        if (!name.toLowerCase().endsWith('.json') || name.endsWith('/')) continue;

        if (localOffset + 30 > bytes.length || readU32(bytes, localOffset) !== LOCAL_FILE_HEADER) {
            throw new Error(`Locator package is missing ${name}.`);
        }

        const localNameLen = readU16(bytes, localOffset + 26);
        const localExtraLen = readU16(bytes, localOffset + 28);
        const dataStart = localOffset + 30 + localNameLen + localExtraLen;
        const dataEnd = dataStart + compSize;
        if (dataEnd > bytes.length) {
            throw new Error(`Locator package truncated while reading ${name}.`);
        }

        const compressed = bytes.slice(dataStart, dataEnd);
        let raw: Uint8Array;
        if (method === 0) {
            raw = compressed;
        } else if (method === 8) {
            raw = await inflateRaw(compressed);
        } else {
            throw new Error(`Locator package uses unsupported compression for ${name}.`);
        }

        jsonFiles.push({ name, text: decoder.decode(raw) });
    }

    const preferred = jsonFiles.find((file) => file.name.endsWith(preferredFileName))
        ?? jsonFiles[0];
    if (!preferred) {
        throw new Error('Locator package does not contain a JSON file.');
    }
    return preferred.text;
}
