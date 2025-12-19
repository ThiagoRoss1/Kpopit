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