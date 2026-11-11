import { DRAFT, SHEET, TOOL_IDS } from "./config.ts";
import type { Masks } from "./engine.ts";

// The drawing saved with each guess (the reference engine's exportDraft/importDraft): a version
// byte, then the three masks at 250×250, 4 bits per value, high nibble first; the whole thing is
// deflated and sent as base64. Inflated length: 1 + 93,750 = 93,751 bytes.

const HALF = DRAFT.side;

/** Masks → version byte + packed 4-bit values (each value is the mean of a 2×2 block). */
export const packDraft = (masks: Masks): Uint8Array => {
    const packed = new Uint8Array(DRAFT.length);
    packed[0] = DRAFT.version;
    let count = 0;

    for (const id of TOOL_IDS) {
        const mask = masks[id];

        for (let y = 0; y < HALF; y++) {
            for (let x = 0; x < HALF; x++) {
                const index = y * 2 * SHEET + x * 2;
                const mean = (mask[index] + mask[index + 1] + mask[index + SHEET] + mask[index + SHEET + 1]) / 4;
                const level = Math.round(mean * DRAFT.levels);
                const byte = 1 + (count >> 1);

                packed[byte] |= count & 1 ? level : level << 4;
                count++;
            }
        }
    }

    return packed;
};

/** Packed values → masks, upsampled back to 500×500 (bilinear: the brush is soft). Throws on an
 *  unknown version or a wrong length. */
export const unpackDraft = (packed: Uint8Array, masks: Masks): void => {
    if (packed[0] !== DRAFT.version || packed.length !== DRAFT.length) throw new Error("Unknown InkIt draft format");

    let count = 0;

    for (const id of TOOL_IDS) {
        const small = new Float32Array(HALF * HALF);

        for (let cell = 0; cell < small.length; cell++) {
            const byte = packed[1 + (count >> 1)];
            small[cell] = (count & 1 ? byte & 15 : byte >> 4) / DRAFT.levels;
            count++;
        }

        const mask = masks[id];

        for (let y = 0; y < SHEET; y++) {
            const sourceY = Math.min(HALF - 1, Math.max(0, (y - 0.5) / 2));
            const top = Math.floor(sourceY);
            const bottom = Math.min(HALF - 1, top + 1);
            const mixY = sourceY - top;

            for (let x = 0; x < SHEET; x++) {
                const sourceX = Math.min(HALF - 1, Math.max(0, (x - 0.5) / 2));
                const left = Math.floor(sourceX);
                const right = Math.min(HALF - 1, left + 1);
                const mixX = sourceX - left;

                const upper = small[top * HALF + left] * (1 - mixX) + small[top * HALF + right] * mixX;
                const lower = small[bottom * HALF + left] * (1 - mixX) + small[bottom * HALF + right] * mixX;

                mask[y * SHEET + x] = upper * (1 - mixY) + lower * mixY;
            }
        }
    }
};

const pipe = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> => {
    const writer = stream.writable.getWriter();
    const written = writer.write(bytes as BufferSource).then(() => writer.close());
    const reader = stream.readable.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value as Uint8Array);
        length += value.length;
    }

    await written;

    const out = new Uint8Array(length);
    let offset = 0;

    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
    }

    return out;
};

const toBase64 = (bytes: Uint8Array): string => {
    let binary = "";

    for (let start = 0; start < bytes.length; start += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
    }

    return btoa(binary);
};

const fromBase64 = (text: string): Uint8Array => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

/** The drawing as the base64 string a guess carries. */
export const exportDraft = async (masks: Masks): Promise<string> => toBase64(await pipe(packDraft(masks), new CompressionStream("deflate")));

/** A saved drawing back onto the masks; throws on a bad payload. */
export const importDraft = async (draft: string, masks: Masks): Promise<void> => {
    unpackDraft(await pipe(fromBase64(draft), new DecompressionStream("deflate")), masks);
};
