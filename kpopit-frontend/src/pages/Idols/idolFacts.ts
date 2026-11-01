import type { IdolProfileData, IdolsPageData } from "../../interfaces/gameInterfaces";
import { formatGroupName } from "../../utils/formatters";
import { nationalities } from "./idolsData";

/** Tile widths on the 6-column grid (the phone grid has 2): "3n" and "2w" go full width on phones. */
export type Span = "6" | "4" | "3" | "3n" | "2" | "2w";

export interface FactChip {
    label: string;
    sub?: string;
    to?: string;
    big?: boolean;
    /** Which of the three chip looks it takes. */
    look: number;
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
    /** The one tile left alone in a phone row spans it. */
    solo?: boolean;
}

export type TabKey = "profile" | "career" | "status";

const COUNTRY_CODES: Record<string, string> = {
    "South Korean": "KOR",
    Japanese: "JPN",
    Chinese: "CHN",
    Taiwanese: "TWN",
    Thai: "THA",
    "Hong Kongese": "HKG",
    Vietnamese: "VNM",
    American: "USA",
    Canadian: "CAN",
    Australian: "AUS",
    "New Zealand": "NZL",
    German: "DEU",
    Dutch: "NLD",
    Indonesian: "IDN",
    British: "GBR",
    Filipina: "PHL",
    Filipino: "PHL",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Tiles on the phone grid: 2 = full row, 1 = half.
const PHONE_WIDTH: Record<Span, number> = { "6": 2, "4": 2, "3n": 2, "2w": 2, "3": 1, "2": 1 };

const shortCompany = (name: string) => name.replace(/ Entertainment\b/g, " Ent.");
const plural = (count: number, one: string, many: string) => (count > 1 ? many : one);
const splitList = (value: string | null) => (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);

function longBirthDate(iso: string | null) {
    if (!iso) return "N/A";

    const [year, month, day] = iso.slice(0, 10).split("-").map(Number);

    return `${MONTHS[month - 1]} ${day}, ${year}`;
}

/** The phone grid is 2 wide: a half-width tile with no partner spans the row. */
function markSolo(facts: Fact[]) {
    let unpairedIndex = -1;

    facts.forEach((fact, index) => {
        if (PHONE_WIDTH[fact.span] !== 1) return;

        unpairedIndex = unpairedIndex >= 0 ? -1 : index;
    });

    if (unpairedIndex >= 0) facts[unpairedIndex].solo = true;

    return facts;
}

/** The three panes of the idol page: profile facts, career, and where the idol plays in KpopIt. */
export function buildFacts(data: IdolProfileData, age: number | null): Record<TabKey, Fact[]> {
    const profile = data.idol_profile;
    const career = data.idol_career;
    const idolNationalities = splitList(profile.nationality);
    const positions = splitList(profile.position);

    const profileFacts: Fact[] = [
        { label: "ARTIST NAME", span: "3n", value: profile.artist_name, big: true },
        { label: "REAL NAME", span: "3n", value: profile.real_name || "N/A" },
        { label: "AGE", span: "2", value: age ? String(age) : "–", sub: "years old", big: true },
        { label: "HEIGHT", span: "2", value: profile.height ? String(profile.height) : "–", sub: "cm", big: true },
        {
            label: plural(idolNationalities.length, "NATIONALITY", "NATIONALITIES"),
            span: "2w",
            value: idolNationalities.map((nationality) => COUNTRY_CODES[nationality] ?? nationality).join(" · "),
            flags: idolNationalities,
        },
        { label: "BORN", span: "4", value: longBirthDate(profile.birth_date) },
        { label: "DEBUT", span: "2", value: career.idol_debut_year ? String(career.idol_debut_year) : "N/A", big: true },
        {
            label: plural(positions.length, "POSITION", "POSITIONS"),
            span: "6",
            chips: positions.map((label, index) => ({ label, look: index })),
        },
    ];

    const activeGroup = career.idol_career.find((group) => group.is_active);
    const pastGroups = career.idol_career.filter((group) => !group.is_active);
    const companies = career.group_companies;

    const parentCompanies = companies.filter((company) => company.role === "Parent Company").map((company) => company.name);
    const parents = parentCompanies.length
        ? parentCompanies
        : companies.filter((company) => company.role !== "Parent Company" && company.parent_company_id === null).map((company) => company.name);
    const labels = companies
        .filter((company) => company.role === "Label" || (company.parent_company_id !== null && company.role !== "Parent Company"))
        .map((company) => company.name);
    const idolCompanies = career.idol_companies.map((company) => company.name);
    const groupSub = [career.group_hangul, activeGroup ? `since ${activeGroup.start_year}` : null].filter(Boolean).join(" · ");

    const careerFacts: Fact[] = [
        {
            label: career.is_former_group ? "LAST GROUP" : "CURRENT GROUP",
            span: "4",
            value: career.group_name ? formatGroupName(career.group_name, career.is_former_group) : "Soloist",
            sub: groupSub || undefined,
        },
        { label: "FANDOM", span: "2", value: career.fandom_name || "N/A" },
        { label: plural(labels.length, "LABEL", "LABELS"), span: "3", value: labels.map(shortCompany).join(", ") || "N/A" },
        { label: plural(parents.length, "PARENT COMPANY", "PARENT COMPANIES"), span: "3", value: parents.map(shortCompany).join(", ") || "N/A" },
        { label: plural(idolCompanies.length, "IDOL COMPANY", "IDOL COMPANIES"), span: "2", value: idolCompanies.map(shortCompany).join(", ") || "N/A" },
        pastGroups.length
            ? {
                label: plural(pastGroups.length, "PAST GROUP", "PAST GROUPS"),
                span: "4",
                chips: pastGroups.map((group, index) => ({
                    label: group.group_name,
                    sub: `${group.start_year}–${group.end_year ?? "now"}`,
                    look: index + 1,
                })),
            }
            : { label: "PAST GROUPS", span: "4", value: "None", sub: "First group" },
    ];

    const modes = Object.entries(data.game_info.game_modes_available)
        .filter(([, isAvailable]) => isAvailable)
        .map(([name]) => name);

    const statusFacts: Fact[] = [
        {
            label: "AVAILABLE IN",
            span: "6",
            chips: modes.map((label, index) => ({ label, to: `/${label.toLowerCase()}`, big: true, look: index })),
        },
        { label: "KPOPIT ID", span: "6", value: `#${profile.idol_id}`, big: true },
    ];

    return {
        profile: markSolo(profileFacts),
        career: markSolo(careerFacts),
        status: markSolo(statusFacts),
    };
}

/** Same group first, then same company, then a shared nationality; up to 12. */
export function relatedIdols(allIdols: IdolsPageData[], data: IdolProfileData): IdolsPageData[] {
    const currentId = data.idol_profile.idol_id;
    const current = allIdols.find((idol) => idol.id === currentId);
    const currentNationalities = splitList(data.idol_profile.nationality);
    const groupName = data.idol_career.group_name;

    const closeness = (idol: IdolsPageData) => {
        if (groupName && idol.group_name === groupName) return 0;
        if (current?.company_name && idol.company_name === current.company_name) return 1;
        if (nationalities(idol).some((nationality) => currentNationalities.includes(nationality))) return 2;

        return 3;
    };

    return allIdols
        .filter((idol) => idol.id !== currentId)
        .map((idol) => ({ idol, rank: closeness(idol) }))
        .filter((entry) => entry.rank < 3)
        .sort((first, second) => first.rank - second.rank || first.idol.id - second.idol.id)
        .slice(0, 12)
        .map((entry) => entry.idol);
}
