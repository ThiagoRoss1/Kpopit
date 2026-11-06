interface CatalogueFacet<Item> {
    key: string;
    selected: string;
    values: (item: Item) => string[];
}

/** Count every option in one pass, applying the other facets without sorting each result set. */
export const countCatalogueFacets = <Item>(
    items: Item[],
    matchesSearch: (item: Item) => boolean,
    facets: CatalogueFacet<Item>[],
) => {
    const counts = new Map(facets.map((facet) => [facet.key, new Map([["", 0]])]));

    for (const item of items) {
        if (!matchesSearch(item)) continue;

        const values = facets.map((facet) => facet.values(item));
        const matches = facets.map((facet, index) => !facet.selected || values[index].includes(facet.selected));

        facets.forEach((facet, index) => {
            if (matches.some((matched, otherIndex) => otherIndex !== index && !matched)) return;

            const options = counts.get(facet.key)!;
            options.set("", options.get("")! + 1);

            for (const value of new Set(values[index])) {
                if (value) options.set(value, (options.get(value) ?? 0) + 1);
            }
        });
    }

    return (facet: string, value: string) => counts.get(facet)?.get(value) ?? 0;
};
