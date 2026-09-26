export const formatCompanyName = (company: string): string => {
    const replacements: Record<string, string> = {
        "Entertainment": "Ent.",
        "Company": "Co.",
        "Communications": "Comms.",
    };

    let result = company;
    for (const [full,  abbr] of Object.entries(replacements)) {
        result = result.replace(full, abbr);
    }

    return result;
};

/**
 * Builds the `/idols/:id/:slug` slug. `group_name` comes from the "current group"
 * join and is NULL for an idol with no active career row, so it is optional here.
 */
export const buildIdolSlug = (artistName: string, groupName?: string | null): string =>
    [artistName, groupName]
        .filter(Boolean)
        .join("-")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();
