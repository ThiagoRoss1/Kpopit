import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/utils";
import type { IdolListItem } from "../../interfaces/gameInterfaces";
import { resolveCdnUrl } from "../../utils/imageUrl";
import Img from "../Img";
import { groupOf } from "./idolGroup";

interface InkSearchProps {
    idols: IdolListItem[];
    /** Idols already guessed: left out of the suggestions, like the other modes. */
    triedIds: number[];
    isPending: boolean;
    /** Winners so far today; null hides the line (calendar days). */
    winnerCount: number | null;
    onGuess: (idol: IdolListItem) => void;
}

const MAX_SUGGESTIONS = 20;

const normalise = (text: string) => text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

const isSoloist = (idol: IdolListItem) => idol.groups?.length === 0;

const asksForSoloists = (wanted: string) => "solo".includes(wanted) || wanted.includes("solo");

/** The idol as the field shows it once picked, as in Classic and Blurry: "Name (Group)". */
const displayName = (idol: IdolListItem) => `${idol.artist_name} (${groupOf(idol)})`;

// The same spring as the Pixelated and Classic lists: a short fade with a 10 px slide, in and out.
const LIST_SPRING = { type: "spring", stiffness: 500, damping: 50 } as const;

/** Suggestions with the same rules as the Classic/Blurry search bar: name, any group (past ones too)
 *  or "solo" for soloists; guessed idols left out; name start, name, group, soloist order. */
const findSuggestions = (idols: IdolListItem[], query: string, triedIds: number[]): IdolListItem[] => {
    const wanted = normalise(query.trim());
    if (!wanted) return [];

    const priority = (idol: IdolListItem) => {
        const name = normalise(idol.artist_name);
        if (name.startsWith(wanted)) return 1;
        if (name.includes(wanted)) return 2;
        if ((idol.all_groups ?? idol.groups ?? []).some((group) => normalise(group).includes(wanted))) return 3;
        if (isSoloist(idol) && asksForSoloists(wanted)) return 4;

        return 5;
    };

    return idols
        .filter((idol) => !triedIds.includes(idol.id))
        .map((idol) => ({ idol, order: priority(idol) }))
        .filter((entry) => entry.order < 5)
        .sort((a, b) => a.order - b.order || a.idol.artist_name.localeCompare(b.idol.artist_name))
        .slice(0, MAX_SUGGESTIONS)
        .map((entry) => entry.idol);
};

/** Guess today's idol like the other modes: type a name or a group, pick a suggestion (the first is
 *  picked by default), then Enter or the button sends it. Guessed idols leave the list. */
const InkSearch = ({ idols, triedIds, isPending, winnerCount, onGuess }: InkSearchProps) => {
    const listId = useId();
    const [query, setQuery] = useState("");
    const [picked, setPicked] = useState<IdolListItem | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const suggestions = useMemo(
        () => (picked ? [] : findSuggestions(idols, query, triedIds)),
        [idols, picked, query, triedIds],
    );

    const current = Math.min(activeIndex, suggestions.length - 1);
    const chosen = picked ?? suggestions[current] ?? null;

    const reset = () => {
        setQuery("");
        setPicked(null);
        setActiveIndex(0);
    };

    const submit = () => {
        if (!chosen || isPending || triedIds.includes(chosen.id)) return;

        onGuess(chosen);
        reset();
    };

    const pick = (idol: IdolListItem) => {
        setPicked(idol);
        setQuery(displayName(idol));
    };

    const move = (direction: 1 | -1) => {
        if (!suggestions.length) return;

        const next = (current + direction + suggestions.length) % suggestions.length;
        setActiveIndex(next);
        document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            move(1);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            move(-1);
        } else if (event.key === "Enter") {
            event.preventDefault();
            submit();
        } else if (event.key === "Escape") {
            event.currentTarget.blur();
        }
    };

    const showList = isFocused && suggestions.length > 0;

    return (
        <div className="flex flex-col gap-3 max-[900px]:gap-2">
            <span className="text-center font-medium text-base text-(--muted) max-[900px]:text-sm">Guess today's idol...</span>

            <div className="relative">
                <div
                    className={cn(
                        "mb-1 flex h-15.5 items-center gap-2 rounded-full border-2 border-(--ink) bg-(--face) px-1.75 max-[900px]:h-13.5",
                        "shadow-[0_6px_0_-2px_#FF8AC4,0_6px_0_0_var(--ink),var(--in)]",
                    )}
                >
                    <input
                        type="text"
                        role="combobox"
                        aria-expanded={showList}
                        aria-controls={listId}
                        aria-activedescendant={showList && current >= 0 ? `${listId}-${current}` : undefined}
                        aria-autocomplete="list"
                        aria-label="Type an idol's name"
                        placeholder="Type an idol's name..."
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        maxLength={60}
                        value={query}
                        // Read-only, not disabled, while a guess is on its way: a disabled field drops
                        // the focus, and the next guess would need a click first.
                        readOnly={isPending}
                        aria-busy={isPending}
                        data-testid="inkit-search"
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setPicked(null);
                            setActiveIndex(0);
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={onKeyDown}
                        className={cn(
                            "h-11.5 min-w-0 flex-1 rounded-full border-0 bg-(--ik-field) px-4.5 outline-0 max-[900px]:h-10",
                            "font-semibold text-base text-(--chip-ink) placeholder:text-(--muted) placeholder:opacity-100 max-[900px]:text-[15px]",
                        )}
                    />

                    <button
                        type="button"
                        aria-label="Guess"
                        disabled={isPending || !chosen}
                        // Keeps the input focused, so the list is still there when the click lands.
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={submit}
                        data-testid="inkit-guess-button"
                        className="inkit-go pp-focus grid size-11.5 flex-none cursor-pointer place-items-center rounded-full border-2 border-(--ink) bg-[#FF70B8] p-0 disabled:cursor-default max-[900px]:size-10"
                    >
                        <Search className="size-4.5 text-white" strokeWidth={3} aria-hidden />
                    </button>
                </div>

                <AnimatePresence>
                    {showList && (
                        <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            transition={LIST_SPRING}
                            className={cn(
                                "absolute inset-x-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[20px] border-2 border-(--ink) bg-(--menu-bg)",
                                "shadow-[4px_5px_0_var(--ctl-off)] transform-gpu",
                            )}
                        >
                            <ul id={listId} role="listbox" aria-label="Idols" className="pp-scroll m-0 flex max-h-80 list-none flex-col gap-0.5 overflow-y-auto p-1.5">
                                {suggestions.map((idol, index) => {
                                    const photo = resolveCdnUrl(idol.image_path, idol.image_version);

                                    return (
                                        <li
                                            key={idol.id}
                                            id={`${listId}-${index}`}
                                            role="option"
                                            aria-selected={index === current}
                                            data-testid="inkit-suggestion"
                                            onPointerDown={(event) => event.preventDefault()}
                                            onClick={() => pick(idol)}
                                            onPointerEnter={() => setActiveIndex(index)}
                                            className={cn("flex cursor-pointer items-center gap-3 rounded-[13px] px-3 py-2.5", index === current && "bg-(--opt-hover)")}
                                        >
                                            {photo && (
                                                <Img
                                                    src={photo}
                                                    alt=""
                                                    className="size-12 flex-none rounded-full border-2 border-(--ink) bg-(--chip-hover) object-cover object-center"
                                                />
                                            )}

                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-bold text-base leading-tight text-(--chip-ink)">{idol.artist_name}</div>
                                                <div className="truncate font-medium text-sm leading-tight text-(--ik-group)">{groupOf(idol)}</div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {winnerCount !== null && (
                <span className="text-center font-medium text-[15px] leading-[1.3] text-(--muted) max-[900px]:text-[13px]" data-testid="inkit-user-count">
                    <b className="font-bold text-(--ik-num)">{winnerCount.toLocaleString("en-US")}</b>
                    {winnerCount === 1 ? " person already found today's idol!" : " people already found today's idol!"}
                </span>
            )}
        </div>
    );
};

export default InkSearch;
