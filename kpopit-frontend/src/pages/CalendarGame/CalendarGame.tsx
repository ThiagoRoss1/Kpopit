import { useCallback, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useSharedGameData } from "../../hooks/useSharedGameData";
import { getAllAlbums, getCalendarDay, postCalendarGuess } from "../../services/api";
import type {
    AlbumSearchResult, CalendarDayData, CalendarMode, FeedbackData, GuessResponse, IdolListItem, PixelatedGuessDetail,
} from "../../interfaces/gameInterfaces";
import type { CardGranted } from "../../interfaces/albumInterfaces";
import BackgroundStyle from "../../components/Background/BackgroundStyle";
import PageLoader from "../../components/Loading/PageLoader";
import PageMeta from "../../components/Seo/PageMeta";
import BlurryStage from "../../components/Blurry/BlurryStage";
import SearchBar from "../../components/GuessSearchBar/SearchBar";
import GuessesGrid from "../../components/GuessesGrid/GuessGrid";
import BlurryGuessGrid from "../../components/Blurry/GuessesGrid/GuessGrid";
import AnswerHintsBox from "../../components/AnswerHints/AnswerHintsBox";
import PixelatedStage from "../../components/Pixelated/PixelatedStage";
import PixelatedSearchBar from "../../components/Pixelated/PixelatedSearchBar";
import PixelatedGuessGrid from "../../components/Pixelated/PixelatedGuessGrid";
import CardGrantedReveal from "../Collection/components/CardGrantedReveal";
import GetBlurLevel, { BLUR_LEVELS } from "../BlurryMode/blurLevels";
import ModeOptions from "../../components/Blurry/buttons/ModeOptions";
import { GetPixelLevel, PIXEL_LEVELS } from "../../utils/pixelLevels";
import { resolveCdnUrl } from "../../utils/imageUrl";
import NotFound from "../NotFound/NotFound";
import { MODES } from "../Calendar/calendarData";
import { cn } from "../../lib/utils";
import "../PixelatedMode/PixelatedMode.css";

const NO_IDOLS: IdolListItem[] = [];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const shortDate = (iso: string) => {
    const [year, month, day] = iso.split("-").map(Number);
    return `${MONTHS[month - 1]} ${day}, ${year}`;
};

// The live pages' title sizes per mode.
const TITLE_SIZES: Record<CalendarMode, string> = {
    classic: "max-sxs:text-4xl sxs:text-5xl zm:text-6xl sm:text-7xl",
    blurry: "max-xxs:text-3xl xxs:text-3xl xs:text-4xl sm:text-5xl",
    pixelated: "text-5xl text-neon-pink",
};

const TITLES: Record<CalendarMode, [string, string]> = { classic: ["Kpop", "it"], blurry: ["Blur", "it"], pixelated: ["Pixel", "It"] };

/** The mode's own title (same look as the live page) with the calendar day under it: back to that
 *  day in the calendar, and a tag with Day N and the date. */
const CalendarHeader = ({ mode, date, dayNumber }: { mode: CalendarMode; date: string; dayNumber: number | null }) => {
    const [firstPart, secondPart] = TITLES[mode];
    const isLight = mode === "pixelated";

    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <Link
                to="/"
                draggable={false}
                className="inline-block p-0 border-0 bg-transparent cursor-pointer transition-all duration-500 transform-gpu hover:scale-105"
            >
                <h1 className={cn("font-bold leading-tight text-center", TITLE_SIZES[mode])}>
                    <span className="kpop-part" style={isLight ? ({ "--kpop-color": "var(--color-neon-pink)" } as CSSProperties) : undefined}>{firstPart}</span>
                    <span className="it-part" style={isLight ? ({ "--it-color": "var(--color-cream)" } as CSSProperties) : undefined}>{secondPart}</span>
                </h1>
            </Link>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
                <Link
                    to={`/calendar?mode=${mode}&date=${date}`}
                    className={cn(
                        "pp-press pp-focus inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full no-underline",
                        "border-2 border-[#1A1418] bg-[#FFFDFA] font-bold text-[13px] text-[#1A1418]",
                        "[--ctl-off:#1A1418] [--pp-in:inset_0_2px_0_#fff,inset_0_-3px_0_rgba(26,20,24,.07)]",
                    )}
                >
                    <ArrowLeft className="size-4" strokeWidth={3} aria-hidden />
                    Calendar
                </Link>

                <span
                    className={cn(
                        "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full -rotate-2",
                        "border-2 border-[#1A1418] bg-[#FF8AC4] shadow-[2px_3px_0_#1A1418,inset_0_2px_0_rgba(255,255,255,.55)]",
                        "font-bold text-[13px] text-[#1A1418]",
                    )}
                >
                    <CalendarDays className="size-4" strokeWidth={2.6} aria-hidden />
                    {dayNumber ? `Day ${dayNumber} · ${shortDate(date)}` : shortDate(date)}
                </span>
            </div>
        </div>
    );
};

type IdolGuess = GuessResponse<Partial<FeedbackData>> & { card_granted?: CardGranted };

/** A past challenge day (/<mode>?date=YYYY-MM-DD), played through the calendar API with the live
 *  pages' components and look. The answer never reaches the browser before the day is finished,
 *  so every row comes back from the server; nothing is kept in localStorage. */
const CalendarGame = ({ mode, date }: { mode: CalendarMode; date: string }) => {
    const { allIdolsData, isInitialized } = useSharedGameData();
    const queryClient = useQueryClient();
    const dayKey = ["calendarDay", mode, date];
    const day = useQuery<CalendarDayData>({ queryKey: dayKey, queryFn: () => getCalendarDay(mode, date), enabled: isInitialized, retry: false });
    const albums = useQuery<AlbumSearchResult[]>({ queryKey: ["allAlbums"], queryFn: getAllAlbums, enabled: mode === "pixelated", staleTime: 1000 * 60 * 60 * 24 });

    const [value, setValue] = useState("");
    const [selected, setSelected] = useState<number | null>(null);
    const [added, setAdded] = useState<{ date: string; idols: IdolGuess[]; albums: PixelatedGuessDetail[] }>({ date, idols: [], albums: [] });
    const [cardGranted, setCardGranted] = useState<CardGranted>(null);
    const [victoryRevealed, setVictoryRevealed] = useState(false);
    const [blurryOptions, setBlurryOptions] = useState({ hardcore: false, color: false });
    const submittingRef = useRef(false);
    // Rows guessed on this visit, on top of what the server restored (a new day starts empty).
    const extra = added.date === date ? added : { date, idols: [], albums: [] };

    const guessMutation = useMutation({
        mutationFn: (id: number) => postCalendarGuess(mode, date, id),
        onSuccess: (data) => {
            if (mode === "pixelated") {
                const album = data.guessed_album_data;
                setAdded((current) => {
                    if (current.albums.some((guess) => guess.album_id === album.album_id)) return current;

                    return { ...current, albums: [...current.albums, { ...album, guess_correct: data.guess_correct }] };
                });
            } else {
                setAdded((current) => {
                    if (current.idols.some((guess) => guess.guessed_idol_data.idol_id === data.guessed_idol_data.idol_id)) return current;

                    return { ...current, idols: [...current.idols, data as IdolGuess] };
                });
                if (data.card_granted) {
                    setCardGranted(data.card_granted);
                    queryClient.invalidateQueries({ queryKey: ["collectionAlbum"] });
                    queryClient.invalidateQueries({ queryKey: ["collectionsList"] });
                }
            }
            if (data.guess_correct) {
                queryClient.invalidateQueries({ queryKey: dayKey });
                queryClient.invalidateQueries({ queryKey: ["calendarTimeline"] });
                queryClient.invalidateQueries({ queryKey: ["userStats"] });
            }
        },
        onSettled: () => {
            submittingRef.current = false;
        },
    });

    const revealVictory = useCallback(() => {
        if (extra.idols.some((guess) => guess.guess_correct) || extra.albums.some((guess) => guess.guess_correct)) {
            setVictoryRevealed(true);
        }
    }, [extra.idols, extra.albums]);

    if (day.isError) return <NotFound />;

    const modeName = MODES.find((option) => option.id === mode)!.name;
    const dayNumber = day.data?.day_number;
    const metadata = (
        <PageMeta
            title={`${modeName} · ${dayNumber == null ? date : `Day ${dayNumber}`} – KpopIt`}
            description={`Play a past ${modeName} challenge from the KpopIt calendar.`}
            path={`/${mode}`}
            noindex="follow"
        />
    );

    if (!day.data || !allIdolsData || (mode === "pixelated" && !albums.data)) {
        return (
            <>
                {metadata}
                <PageLoader tone="dark" />
            </>
        );
    }

    const { puzzle, game, status } = day.data;
    const finished = status === "won_live" || status === "won_calendar";
    const restoredIdols = (mode === "classic" ? game?.today_guesses_details : game?.blurry_guesses_details) ?? [];
    const idolGuesses: IdolGuess[] = [
        ...restoredIdols,
        ...extra.idols.filter((added) => !restoredIdols.some((restored) => restored.guessed_idol_data.idol_id === added.guessed_idol_data.idol_id)),
    ];
    const restoredAlbums = game?.pixelated_guesses_details ?? [];
    const albumGuesses = [
        ...restoredAlbums,
        ...extra.albums.filter((added) => !restoredAlbums.some((restored) => restored.album_id === added.album_id)),
    ];
    const attempts = mode === "pixelated" ? albumGuesses.length : idolGuesses.length;
    const won = finished || idolGuesses.some((guess) => guess.guess_correct) || albumGuesses.some((guess) => guess.guess_correct);
    const wonThisVisit = extra.idols.some((guess) => guess.guess_correct) || extra.albums.some((guess) => guess.guess_correct);
    const showVictory = won && (!wonThisVisit || victoryRevealed);

    const submit = () => {
        if (selected === null || submittingRef.current || guessMutation.isPending || won) return;

        const alreadyGuessed = mode === "pixelated"
            ? albumGuesses.some((guess) => guess.album_id === selected)
            : idolGuesses.some((guess) => guess.guessed_idol_data.idol_id === selected);

        if (alreadyGuessed) return;

        // A ref closes the gap before React renders the mutation's pending state.
        submittingRef.current = true;
        guessMutation.mutate(selected);
        setValue("");
        setSelected(null);
    };
    const guessedIdolIds = idolGuesses.map((guess) => guess.guessed_idol_data.idol_id);
    const blurIdols = allIdolsData.filter((idol) => !!idol.blur_image_path);
    const coverUrl = resolveCdnUrl(puzzle.cover_path ?? null) ?? undefined;
    const blurUrl = puzzle.blur_image_path ? `${resolveCdnUrl(puzzle.blur_image_path)}?v=${puzzle.blur_image_version}` : null;

    const label = `Guess this day's ${mode === "pixelated" ? "album" : "idol"}...`;
    const search = !showVictory && (
        <div className="w-full flex flex-col items-center mb-6">
            <span className={cn("mb-1 text-[14px] sm:text-[16px]", mode === "pixelated" ? "text-ink/70" : "drop-shadow-lg text-[#d7d7d7]/85")}>{label}</span>
            <div className={cn("relative w-full mx-auto flex justify-center z-40", mode !== "pixelated" && "px-4")}>
                {mode === "pixelated" ? (
                    <PixelatedSearchBar
                        allAlbums={albums.data ?? []}
                        value={value}
                        onAlbumSelect={setValue}
                        onAlbumSelectId={(album) => setSelected(album.id)}
                        onSubmit={submit}
                        excludedAlbums={albumGuesses.map((guess) => guess.album_id)}
                        disabled={won}
                        submitting={guessMutation.isPending}
                    />
                ) : (
                    <SearchBar
                        allIdols={mode === "blurry" ? blurIdols : allIdolsData ?? NO_IDOLS}
                        value={value}
                        onIdolSelect={setValue}
                        onIdolSelectId={(idol) => setSelected(idol.id)}
                        onSubmit={submit}
                        excludedIdols={guessedIdolIds}
                        disabled={guessMutation.isPending || won}
                        gameMode={mode}
                    />
                )}
            </div>
            {guessMutation.isError && <p role="alert" className="mt-3 text-[#fd5c63] font-semibold">That guess didn't go through. Try again.</p>}
        </div>
    );
    const result = showVictory && (
        <div className="w-full max-w-md px-4 mb-10 flex flex-col items-center gap-3 text-center" role="status">
            <p className={cn("m-0 font-bold text-2xl", mode === "pixelated" ? "text-ink" : "text-white")}>You found it!</p>
            {day.data.answer && (
                <p className={cn("m-0 font-semibold", mode === "pixelated" ? "text-ink/70" : "text-white/85")}>{day.data.answer.artist_name ?? day.data.answer.album_name}</p>
            )}
            {day.data.xp !== null && <p className="m-0 text-neon-pink font-bold">{`+${day.data.xp} XP`}</p>}
            {cardGranted && <CardGrantedReveal cardGranted={cardGranted} />}
        </div>
    );
    const header = <CalendarHeader mode={mode} date={date} dayNumber={day.data.day_number} />;

    if (mode === "pixelated") {
        const blockSize = showVictory ? PIXEL_LEVELS[PIXEL_LEVELS.length - 1] : GetPixelLevel(attempts);
        return (
            <div className="pixelmode min-h-full w-full">
                {metadata}
                <div className="pixelmode__bg" aria-hidden="true"><div className="pixelmode__margin" /></div>
                <div className="mx-auto max-w-340 px-4 zm:px-6 sm:px-12 md:px-20 lg:px-10 py-4 lg:py-10">
                    <div className="flex flex-col lg:flex-row gap-4 lg:gap-10 items-center lg:items-start">
                        <div className="lg:hidden">{header}</div>
                        <PixelatedStage
                            coverUrl={coverUrl}
                            blockSize={blockSize}
                            guessCount={attempts}
                            gameEnded={showVictory}
                            releaseYear={puzzle.release_year ?? 0}
                            artistName={puzzle.group_name ?? ""}
                            persist={false}
                        />
                        <div className="flex-1 min-w-0 w-full">
                            <div className="hidden lg:block mb-6">{header}</div>
                            {search}
                            {result}
                            <PixelatedGuessGrid guesses={albumGuesses} onAnimationComplete={revealVictory} persist={false} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {metadata}
            <BackgroundStyle attempts={attempts} />
            <div className={cn("flex flex-col items-center justify-start w-full min-h-full pb-24", mode === "classic" ? "mt-12" : "mt-4")}>
                <div className="mb-10">{header}</div>

                {mode === "classic" && (
                    <div className="w-full flex flex-col items-center justify-center mb-10.25">
                        <AnswerHintsBox memberCount={puzzle.member_count ?? null} groups={puzzle.groups ?? null} isFormerGroup={puzzle.is_former_group ?? false} attempts={attempts} gameEnded={showVictory} persist={false} />
                    </div>
                )}

                {mode === "blurry" && blurUrl && (
                    <BlurryStage
                        src={blurUrl}
                        blur={blurryOptions.hardcore ? BLUR_LEVELS[0] : GetBlurLevel(attempts)}
                        color={blurryOptions.color}
                        gameEnded={showVictory}
                        answerName={day.data.answer?.artist_name}
                    />
                )}

                {mode === "blurry" && !showVictory && (
                    <div className="mb-6">
                        <ModeOptions
                            options={blurryOptions}
                            onToggle={(option) => setBlurryOptions((current) => ({ ...current, [option]: !current[option] }))}
                            attempts={attempts}
                            groups={puzzle.groups ?? null}
                            persist={false}
                        />
                    </div>
                )}

                {search}
                {result}

                <div className="w-full flex items-center justify-center">
                    {mode === "classic" && <GuessesGrid guesses={idolGuesses as GuessResponse[]} allIdols={allIdolsData} onAllAnimationsComplete={revealVictory} persist={false} />}
                    {mode === "blurry" && <BlurryGuessGrid guesses={idolGuesses} onAnimationComplete={revealVictory} persist={false} />}
                </div>
            </div>
        </>
    );
};

export default CalendarGame;
