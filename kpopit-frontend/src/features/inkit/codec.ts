import { DRAFT, SHEET_SIDE, TOOL_IDS, type ToolId } from "./config.ts";

// A saved drawing: the three tool masks at 250x250, 4 bits per value, deflated, after one
// version byte, as base64. The server stores it as it is and checks version and length.

type Masks = Record<ToolId, Float32Array>;

const SIDE = DRAFT.side;
const CELLS = SIDE * SIDE;
const SCALE = SHEET_SIDE / SIDE;

/** Packed length before deflate: three masks, two 4-bit values per byte. */
export const PACKED_LENGTH = (TOOL_IDS.length * CELLS) / 2;

/** Sheet masks → 4-bit values at the saved size (each cell is the mean of its sheet pixels). */
export const packMasks = (masks: Masks): Uint8Array => {
    const packed = new Uint8Array(PACKED_LENGTH);
    let cursor = 0;

    for (const tool of TOOL_IDS) {
        const mask = masks[tool];

        for (let cell = 0; cell < CELLS; cell++) {
            const left = (cell % SIDE) * SCALE;
            const top = Math.floor(cell / SIDE) * SCALE;
            let sum = 0;

            for (let dy = 0; dy < SCALE; dy++) {
                for (let dx = 0; dx < SCALE; dx++) sum += mask[(top + dy) * SHEET_SIDE + left + dx];
            }

            const level = Math.round(Math.max(0, Math.min(1, sum / (SCALE * SCALE))) * DRAFT.levels);

            if (cursor % 2 === 0) packed[cursor >> 1] = level << 4;
            else packed[cursor >> 1] |= level;

            cursor++;
        }
    }

    return packed;
};

/** 4-bit values → sheet masks, smoothed back up to sheet size (bilinear between cell centres). */
export const unpackMasks = (packed: Uint8Array): Masks => {
    if (packed.length !== PACKED_LENGTH) throw new Error("Invalid drawing");

    const masks = {} as Masks;

    TOOL_IDS.forEach((tool, toolIndex) => {
        const small = new Float32Array(CELLS);

        for (let cell = 0; cell < CELLS; cell++) {
            const cursor = toolIndex * CELLS + cell;
            const byte = packed[cursor >> 1];

            small[cell] = (cursor % 2 === 0 ? byte >> 4 : byte & 15) / DRAFT.levels;
        }

        const mask = new Float32Array(SHEET_SIDE * SHEET_SIDE);

        for (let y = 0; y < SHEET_SIDE; y++) {
            const sourceY = Math.max(0, Math.min(SIDE - 1, (y + 0.5) / SCALE - 0.5));
            const top = Math.floor(sourceY);
            const bottom = Math.min(SIDE - 1, top + 1);
            const mixY = sourceY - top;

            for (let x = 0; x < SHEET_SIDE; x++) {
                const sourceX = Math.max(0, Math.min(SIDE - 1, (x + 0.5) / SCALE - 0.5));
                const left = Math.floor(sourceX);
                const right = Math.min(SIDE - 1, left + 1);
                const mixX = sourceX - left;

                const upper = small[top * SIDE + left] * (1 - mixX) + small[top * SIDE + right] * mixX;
                const lower = small[bottom * SIDE + left] * (1 - mixX) + small[bottom * SIDE + right] * mixX;

                mask[y * SHEET_SIDE + x] = upper * (1 - mixY) + lower * mixY;
            }
        }

        masks[tool] = mask;
    });

    return masks;
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

/** The drawing as the string a guess carries. */
export const encodeDraft = async (masks: Masks): Promise<string> => {
    const deflated = await pipe(packMasks(masks), new CompressionStream("deflate"));
    const blob = new Uint8Array(deflated.length + 1);

    blob[0] = DRAFT.version;
    blob.set(deflated, 1);

    return toBase64(blob);
};

/** A saved drawing back to sheet masks; throws on an unknown version or a wrong length. */
export const decodeDraft = async (draft: string): Promise<Masks> => {
    const blob = fromBase64(draft);
    if (blob.length < 2 || blob[0] !== DRAFT.version) throw new Error("Invalid drawing");

    return unpackMasks(await pipe(blob.subarray(1), new DecompressionStream("deflate")));
};
