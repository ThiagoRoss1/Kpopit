import type { ToolId } from "../../features/inkit/config.ts";

/** Names shown on the tool buttons and read by screen readers. */
export const TOOL_INFO: Record<ToolId, { name: string; reveals: string }> = {
    pencil: { name: "Pencil", reveals: "a loose sketch" },
    pen: { name: "Pen", reveals: "clean line art" },
    paint: { name: "Paint", reveals: "the real colours" },
};

/** The paper behind the hint cards, the sheet and the thumbnails shares these colours. */
export const PAPER_COLOR = "#FBF8F1";
