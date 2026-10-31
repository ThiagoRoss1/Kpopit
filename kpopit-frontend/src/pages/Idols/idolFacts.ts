import type { IdolProfileData, IdolsPageData } from "../../interfaces/gameInterfaces";
import { formatGroupName } from "../../utils/formatters";
import { nationalities } from "./idolsData";

/** Tile widths on the 6-column grid (the mobile grid has 2): "3n" and "2w" go full width on mobile. */
export type Span = "6" | "4" | "3" | "3n" | "2" | "2w";

export interface FactChip {
    label: string;
    sub?: string;
    to?: string;
    big?: boolean;
    k: number;
}

export interface Fact {
    label: string;
    span: Span;
    value?: string;
    sub?: string;
    chips?: FactChip[];
    flags?: string[];
    /** Numbers and short values get the larger size. */
    big?: boolean;
    /** The one tile left alone in a mobile row spans it. */
    solo?: boolean;
}

export type TabKey = "profile" | "career" | "status";

const NAT3: Record<string, string> = {
    "South Korean": "KOR", Japanese: "JPN", Chinese: "CHN", Taiwanese: "TWN", Thai: "THA", "Hong Kongese": "HKG", Vietnamese: "VNM",
    American: "USA", Canadian: "CAN", Australian: "AUS", "New Zealand": "NZL", German: "DEU", Dutch: "NLD", Indonesian: "IDN",
    British: "GBR", Filipina: "PHL", Filipino: "PHL",
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ent = (name: string) => name.replace(/ Entertainment\b/g, " Ent.");
const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

function birthLong(iso: string | null) {
    if (!iso) return "N/A";
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** The mobile grid is 2 wide: a width-1 tile with no partner spans the row. */
function markSolo(facts: Fact[]) {
    const mobile: Record<Span, number> = { "6": 2, "4": 2, "3n": 2, "2w": 2, "3": 1, "2": 1 };
    let open = -1;
    facts.forEach((f, k) => {
        if (mobile[f.span] !== 1) return;
        open = open >= 0 ? -1 : k;
    });
    if (open >= 0) facts[open].solo = true;
    return facts;
}

/** The three panes of the idol page: profile facts, career, and where the idol plays in KpopIt. */
export function buildFacts(data: IdolProfileData, age: number | null): Record<TabKey, Fact[]> {
    const p = data.idol_profile;
    const c = data.idol_career;
    const nats = (p.nationality ?? "").split(",").map((n) => n.trim()).filter(Boolean);
    const positions = (p.position ?? "").split(",").map((s) => s.trim()).filter(Boolean);

    const profile: Fact[] = [
        { label: "ARTIST NAME", span: "3n", value: p.artist_name, big: true },
        { label: "REAL NAME", span: "3n", value: p.real_name || "N/A" },
        { label: "AGE", span: "2", value: age ? String(age) : "–", sub: "years old", big: true },
        { label: "HEIGHT", span: "2", value: p.height ? String(p.height) : "–", sub: "cm", big: true },
        { label: plural(nats.length, "NATIONALITY", "NATIONALITIES"), span: "2w", value: nats.map((n) => NAT3[n] ?? n).join(" · "), flags: nats },
        { label: "BORN", span: "4", value: birthLong(p.birth_date) },
        { label: "DEBUT", span: "2", value: c.idol_debut_year ? String(c.idol_debut_year) : "N/A", big: true },
        { label: plural(positions.length, "POSITION", "POSITIONS"), span: "6", chips: positions.map((label, k) => ({ label, k })) },
    ];

    const active = c.idol_career.find((g) => g.is_active);
    const past = c.idol_career.filter((g) => !g.is_active);
    const companies = c.group_companies;
    const parents = companies.filter((co) => co.role === "Parent Company").map((co) => co.name);
    const parent = parents.length ? parents : companies.filter((co) => co.role !== "Parent Company" && co.parent_company_id === null).map((co) => co.name);
    const labels = companies.filter((co) => co.role === "Label" || (co.parent_company_id !== null && co.role !== "Parent Company")).map((co) => co.name);
    const idolCompanies = c.idol_companies.map((co) => co.name);
    const groupSub = [c.group_hangul, active ? `since ${active.start_year}` : null].filter(Boolean).join(" · ");

    const career: Fact[] = [
        { label: c.is_former_group ? "LAST GROUP" : "CURRENT GROUP", span: "4", value: c.group_name ? formatGroupName(c.group_name, c.is_former_group) : "Soloist", sub: groupSub || undefined },
        { label: "FANDOM", span: "2", value: c.fandom_name || "N/A" },
        { label: plural(labels.length, "LABEL", "LABELS"), span: "3", value: labels.map(ent).join(", ") || "N/A" },
        { label: plural(parent.length, "PARENT COMPANY", "PARENT COMPANIES"), span: "3", value: parent.map(ent).join(", ") || "N/A" },
        { label: plural(idolCompanies.length, "IDOL COMPANY", "IDOL COMPANIES"), span: "2", value: idolCompanies.map(ent).join(", ") || "N/A" },
        past.length
            ? { label: plural(past.length, "PAST GROUP", "PAST GROUPS"), span: "4", chips: past.map((g, k) => ({ label: g.group_name, sub: `${g.start_year}–${g.end_year ?? "now"}`, k: k + 1 })) }
            : { label: "PAST GROUPS", span: "4", value: "None", sub: "First group" },
    ];

    const modes = Object.entries(data.game_info.game_modes_available).filter(([, on]) => on).map(([name]) => name);
    const status: Fact[] = [
        { label: "AVAILABLE IN", span: "6", chips: modes.map((label, k) => ({ label, to: `/${label.toLowerCase()}`, big: true, k })) },
        { label: "KPOPIT ID", span: "6", value: `#${p.idol_id}`, big: true },
    ];

    return { profile: markSolo(profile), career: markSolo(career), status: markSolo(status) };
}

/** Same group first, then same company, then a shared nationality; up to 12. */
export function relatedIdols(all: IdolsPageData[], data: IdolProfileData): IdolsPageData[] {
    const me = all.find((i) => i.id === data.idol_profile.idol_id);
    const myNats = (data.idol_profile.nationality ?? "").split(",").map((n) => n.trim());
    const rank = (i: IdolsPageData) =>
        data.idol_career.group_name && i.group_name === data.idol_career.group_name ? 0
            : me?.company_name && i.company_name === me.company_name ? 1
                : nationalities(i).some((n) => myNats.includes(n)) ? 2 : 3;
    return all
        .filter((i) => i.id !== data.idol_profile.idol_id)
        .map((i) => ({ i, r: rank(i) }))
        .filter((x) => x.r < 3)
        .sort((a, b) => a.r - b.r || a.i.id - b.i.id)
        .slice(0, 12)
        .map((x) => x.i);
}
