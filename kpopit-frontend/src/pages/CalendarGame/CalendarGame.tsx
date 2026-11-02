import { useState, type CSSProperties } from "react";
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
import Img from "../../components/Img";
import SearchBar from "../../components/GuessSearchBar/SearchBar";
import GuessesGrid from "../../components/GuessesGrid/GuessGrid";
import BlurryGuessGrid from "../../components/Blurry/GuessesGrid/GuessGrid";
import AnswerHintsBox from "../../components/AnswerHints/AnswerHintsBox";
import PixelatedCanvas from "../../components/Pixelated/PixelatedCanvas";
import PixelatedHints from "../../components/Pixelated/PixelatedHints";
import PixelatedSearchBar from "../../components/Pixelated/PixelatedSearchBar";
import PixelatedGuessGrid from "../../components/Pixelated/PixelatedGuessGrid";
import CardGrantedReveal from "../Collection/components/CardGrantedReveal";
import GetBlurLevel from "../BlurryMode/blurLevels";
import { GetPixelLevel, PIXEL_LEVELS } from "../../utils/pixelLevels";
import { resolveCdnUrl } from "../../utils/imageUrl";
import NotFound from "../NotFound/NotFound";
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
    // Rows guessed on this visit, on top of what the server restored (a new day starts empty).
    const extra = added.date === date ? added : { date, idols: [], albums: [] };

    const guessMutation = useMutation({
        mutationFn: (id: number) => postCalendarGuess(mode, date, id),
        onSuccess: (data) => {
            if (mode === "pixelated") {
                const album = data.guessed_album_data;
                setAdded({ ...extra, albums: [...extra.albums, { ...album, guess_correct: data.guess_correct }] });
            } else {
                setAdded({ ...extra, idols: [...extra.idols, data as IdolGuess] });
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
    });

    if (day.isError) return <NotFound />;
    if (!day.data || !allIdolsData || (mode === "pixelated" && !albums.data)) return <PageLoader tone="dark" />;

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

    const submit = () => {
        if (selected === null || guessMutation.isPending || won) return;
        guessMutation.mutate(selected);
        setValue("");
        setSelected(null);
    };
    const guessedIdolIds = idolGuesses.map((guess) => guess.guessed_idol_data.idol_id);
    const blurIdols = allIdolsData.filter((idol) => !!idol.blur_image_path);
    const coverUrl = resolveCdnUrl(puzzle.cover_path ?? null) ?? undefined;
    const blurUrl = puzzle.blur_image_path ? `${resolveCdnUrl(puzzle.blur_image_path)}?v=${puzzle.blur_image_version}` : null;

    const label = `Guess this day's ${mode === "pixelated" ? "album" : "idol"}...`;
    const search = !won && (
        <div className="w-full flex flex-col items-center mb-6">
            <span className={cn("mb-1 text-[14px] sm:text-[16px]", mode === "pixelated" ? "text-ink/70" : "drop-shadow-lg text-[#d7d7d7]/85")}>{label}</span>
            <div className="relative w-full max-w-4xl px-4 mx-auto flex justify-center z-40">
                {mode === "pixelated" ? (
                    <PixelatedSearchBar
                        allAlbums={albums.data ?? []}
                        value={value}
                        onAlbumSelect={setValue}
                        onAlbumSelectId={(album) => setSelected(album.id)}
                        onSubmit={submit}
                        excludedAlbums={albumGuesses.map((guess) => guess.album_id)}
                        disabled={guessMutation.isPending}
                    />
                ) : (
                    <SearchBar
                        allIdols={mode === "blurry" ? blurIdols : allIdolsData ?? NO_IDOLS}
                        value={value}
                        onIdolSelect={setValue}
                        onIdolSelectId={(idol) => setSelected(idol.id)}
                        onSubmit={submit}
                        excludedIdols={guessedIdolIds}
                        disabled={guessMutation.isPending}
                        gameMode={mode}
                    />
                )}
            </div>
            {guessMutation.isError && <p role="alert" className="mt-3 text-[#fd5c63] font-semibold">That guess didn't go through. Try again.</p>}
        </div>
    );
    const result = won && (
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
        const blockSize = won ? PIXEL_LEVELS[PIXEL_LEVELS.length - 1] : GetPixelLevel(attempts);
        return (
            <div className="pixelmode min-h-full w-full">
                <div className="pixelmode__bg" aria-hidden="true"><div className="pixelmode__margin" /></div>
                <div className="mx-auto max-w-340 px-4 zm:px-6 sm:px-12 md:px-20 lg:px-10 py-4 lg:py-10">
                    <div className="flex flex-col lg:flex-row gap-4 lg:gap-10 items-center lg:items-start">
                        <div className="lg:hidden">{header}</div>
                        <div className="flex flex-col w-full lg:w-1/2 xl:w-160">
                            <div className="pixel-stage relative w-full h-70 xxs:h-75 xs:h-80 xm:h-85 zm:h-95 sm:h-100 md:h-110 xl:h-130 mx-auto select-none">
                                {/* Same stage as the live Pixelated page: the record behind, the sleeve in front. */}
                                <div
                                    className={cn(
                                        "absolute z-1 flex aspect-square",
                                        "left-1/2 lg:left-32 xl:left-36 top-5 md:top-3",
                                        "translate-x-[-35%] xs:translate-x-[-30%] zm:translate-x-[-30%] md:translate-x-[-25%] lg:translate-x-[-2%] xl:translate-x-[5%]",
                                        "w-55 xxs:w-60 xs:w-65 xm:w-70 zm:w-76 sm:w-80 md:w-90 lg:w-90 xl:w-110",
                                    )}
                                >
                                    <div className="pixel-vinyl">
                                        <div className="pixel-vinyl__spin">
                                            <div className="pixel-vinyl__label overflow-hidden">
                                                <PixelatedCanvas imageUrl={coverUrl} blockSize={blockSize} alt="Pixelated album cover" className="block size-full rounded-full object-cover" />
                                            </div>
                                        </div>
                                        <div className="pixel-vinyl__light" />
                                        <div className="pixel-vinyl__hole" />
                                    </div>
                                </div>
                                <div
                                    className={cn(
                                        "pixel-sleeve absolute z-2 flex -rotate-4 rounded-2xl rounded-b-3xl",
                                        "border-2 border-cream bg-ink shadow-[0_14px_30px_rgba(0,0,0,0.35),0_4px_10px_rgba(0,0,0,0.2)]",
                                        "left-1/2 lg:left-0 top-[2%]",
                                        "translate-x-[-55%] xs:translate-x-[-65%] md:translate-x-[-60%] lg:translate-x-0",
                                        "w-55 xxs:w-60 xs:w-65 xm:w-70 zm:w-76 sm:w-80 md:w-90 lg:w-90 xl:w-110",
                                        "h-65 xxs:h-70 xs:h-75 xm:h-80 zm:h-86 sm:h-90 md:h-100 lg:h-100 xl:h-120",
                                    )}
                                >
                                    <div className="relative flex items-center justify-center p-4 w-full h-fit">
                                        <span className="pixel-washi absolute top-0 -left-6 w-[22%] h-5.5 z-4 rotate-[-34.8deg]" />
                                        <span className="pixel-washi absolute top-0 -right-6 w-[22%] h-5.5 z-5 rotate-[34.8deg]" />
                                        <div className="relative w-full aspect-square rounded-xl overflow-hidden flex flex-col bg-transparent">
                                            <PixelatedCanvas imageUrl={coverUrl} blockSize={blockSize} alt="Pixelated album cover" className="block size-full object-cover" />
                                        </div>
                                    </div>
                                    <div
                                        className={cn(
                                            "absolute inset-x-0 bottom-4 z-3 text-center",
                                            "font-caveat text-xl xs:text-2xl leading-none tracking-[0.02em] text-white text-shadow-[0_2px_8px_rgba(0,0,0,0.6)]",
                                        )}
                                    >
                                        Guess the album
                                    </div>
                                </div>
                            </div>
                            {!won && (
                                <div className="mt-2 lg:mt-6 flex items-center justify-center">
                                    <PixelatedHints guessCount={attempts} releaseYear={puzzle.release_year ?? 0} artistName={puzzle.group_name ?? ""} persist={false} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 w-full flex flex-col items-center">
                            <div className="hidden lg:block mb-6">{header}</div>
                            {search}
                            {result}
                            <PixelatedGuessGrid guesses={albumGuesses} persist={false} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <BackgroundStyle attempts={attempts} />
            <div className={cn("flex flex-col items-center justify-start w-full min-h-full pb-24", mode === "classic" ? "mt-12" : "mt-4")}>
                <div className="mb-10">{header}</div>

                {mode === "classic" && (
                    <div className="w-full flex flex-col items-center justify-center mb-10.25">
                        <AnswerHintsBox memberCount={puzzle.member_count ?? null} groups={puzzle.groups ?? null} isFormerGroup={puzzle.is_former_group ?? false} attempts={attempts} gameEnded={won} persist={false} />
                    </div>
                )}

                {mode === "blurry" && blurUrl && (
                    <div
                        className={cn(
                            "relative flex items-center justify-center overflow-hidden mb-4 rounded-[46px] border-2 border-white bg-black",
                            "max-xxs:w-55 xxs:w-60 xs:w-70 xm:w-70 zm:w-80 sm:w-100",
                            "max-xxs:h-80 xxs:h-88 xs:h-98 xm:h-98 zm:h-108 sm:h-128",
                        )}
                    >
                        {["top-5 left-5 border-l-3 border-t-3", "top-5 right-5 border-r-3 border-t-3", "bottom-5 left-5 border-l-3 border-b-3", "bottom-5 right-5 border-r-3 border-b-3"].map((corner) => (
                            <div key={corner} className={cn("absolute z-10 max-xxs:size-4 xxs:size-4 xs:size-6 border-white/20", corner)} />
                        ))}
                        <Img
                            priority
                            src={blurUrl}
                            alt={won ? "Blurry image, day finished" : "Blurry image of the day's idol"}
                            style={{ filter: won ? "none" : `blur(${GetBlurLevel(attempts)}px) grayscale(100%)` }}
                            draggable={false}
                            className="size-full object-cover select-none pointer-events-none transition-all duration-1000"
                        />
                    </div>
                )}

                {search}
                {result}

                <div className="w-full flex items-center justify-center">
                    {mode === "classic" && <GuessesGrid guesses={idolGuesses as GuessResponse[]} allIdols={allIdolsData} onAllAnimationsComplete={() => {}} persist={false} />}
                    {mode === "blurry" && <BlurryGuessGrid guesses={idolGuesses} persist={false} />}
                </div>
            </div>
        </>
    );
};

export default CalendarGame;
