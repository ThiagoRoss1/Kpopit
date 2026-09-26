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
/**
 * Prefix for an idol whose only group is a past one (`is_former_group`). Empty on purpose:
 * she shows her last group like any member. Set to e.g. "ex-" to mark it everywhere at once.
 */
const FORMER_GROUP_PREFIX = "";

export const formatGroupName = (groupName: string, isFormerGroup?: boolean): string =>
    isFormerGroup ? `${FORMER_GROUP_PREFIX}${groupName}` : groupName;

export const buildIdolSlug = (artistName: string, groupName?: string | null): string =>
    [artistName, groupName]
        .filter(Boolean)
        .join("-")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();
