import type { IdolListItem } from "../../interfaces/gameInterfaces";

/** The group shown next to an idol: her current one, else her first, else "Soloist". */
export const groupOf = (idol: IdolListItem): string => idol.active_group ?? idol.groups?.[0] ?? "Soloist";
