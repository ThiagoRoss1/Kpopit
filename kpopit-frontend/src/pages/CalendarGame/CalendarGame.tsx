import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarCheck } from "lucide-react";
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

const NO_IDOLS: IdolListItem[] = [];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return `${MONTHS[m - 1]} ${d}, ${y}`;
};

type IdolGuess = GuessResponse<Partial<FeedbackData>> & { card_granted?: CardGranted };

/** A past challenge day (/<mode>?date=YYYY-MM-DD), played through the calendar API with the live
 *  pages' components and look. The answer never reaches the browser before the day is finished,
 *  so every row comes back from the server; nothing is kept in localStorage. */
export default function CalendarGame({ mode, date }: { mode: CalendarMode; date: string }) {
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

    const guess = useMutation({
        mutationFn: (id: number) => postCalendarGuess(mode, date, id),
        onSuccess: (data) => {
            if (mode === "pixelated") {
                const g = data.guessed_album_data;
                setAdded({ ...extra, albums: [...extra.albums, { ...g, guess_correct: data.guess_correct }] });
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
    if (!day.data || !allIdolsData || (mode === "pixelated" && !albums.data)) return <PageLoader />;

    const { puzzle, game, status } = day.data;
    const finished = status === "won_live" || status === "won_calendar";
    const restoredIdols = (mode === "classic" ? game?.today_guesses_details : game?.blurry_guesses_details) ?? [];
    const idolGuesses: IdolGuess[] = [...restoredIdols, ...extra.idols.filter((g) => !restoredIdols.some((r) => r.guessed_idol_data.idol_id === g.guessed_idol_data.idol_id))];
    const restoredAlbums = game?.pixelated_guesses_details ?? [];
    const albumGuesses = [...restoredAlbums, ...extra.albums.filter((g) => !restoredAlbums.some((r) => r.album_id === g.album_id))];
    const attempts = mode === "pixelated" ? albumGuesses.length : idolGuesses.length;
    const won = finished || idolGuesses.some((g) => g.guess_correct) || albumGuesses.some((g) => g.guess_correct);

    const submit = () => {
        if (selected === null || guess.isPending || won) return;
        guess.mutate(selected);
        setValue("");
        setSelected(null);
    };
    const guessedIdolIds = idolGuesses.map((g) => g.guessed_idol_data.idol_id);
    const blurIdols = allIdolsData.filter((idol) => !!idol.blur_image_path);
    const coverUrl = resolveCdnUrl(puzzle.cover_path ?? null) ?? undefined;
    const blurUrl = puzzle.blur_image_path ? `${resolveCdnUrl(puzzle.blur_image_path)}?v=${puzzle.blur_image_version}` : null;

    return (
        <>
            <BackgroundStyle attempts={attempts} />
            <div className="min-h-full w-full flex flex-col items-center justify-start pb-24">
                <div className="w-full max-w-3xl px-4 mt-8 mb-8 flex flex-col items-center gap-3 text-center">
                    <Link to={`/calendar?mode=${mode}&date=${date}`} className="self-start inline-flex items-center gap-2 text-white/80 font-bold hover:text-neon-pink transition-colors">
                        <ArrowLeft className="w-4 h-4" strokeWidth={3} aria-hidden />
                        Calendar
                    </Link>
                    <h1 className="leading-tight text-4xl sm:text-5xl font-bold">
                        <span className="kpop-part">{day.data.day_number ? `Day ${day.data.day_number}` : "Calendar"}</span>
                    </h1>
                    <p className="m-0 text-white/85 font-semibold">{`${mode[0].toUpperCase()}${mode.slice(1)} · ${longDate(date)}`}</p>
                    <p className="m-0 inline-flex items-center gap-2 text-[#d7d7d7]/85 text-sm">
                        <CalendarCheck className="w-4 h-4" aria-hidden />
                        Calendar game: counts as a win, never for your streak.
                    </p>
                </div>

                {mode === "classic" && (
                    <div className="w-full flex flex-col items-center justify-center mb-10">
                        <AnswerHintsBox memberCount={puzzle.member_count ?? null} groups={puzzle.groups ?? null} isFormerGroup={puzzle.is_former_group ?? false} attempts={attempts} gameEnded={won} persist={false} />
                    </div>
                )}

                {mode === "blurry" && blurUrl && (
                    <div className="mb-10 rounded-[20px] overflow-hidden border border-white/20">
                        <Img
                            priority
                            src={blurUrl}
                            alt={won ? "Blurry image, day finished" : "Blurry image of the day's idol"}
                            style={{ filter: won ? "none" : `blur(${GetBlurLevel(attempts)}px) grayscale(100%)` }}
                            draggable={false}
                            className="max-xxs:w-55 max-xxs:h-80 xxs:w-60 xxs:h-88 xs:w-70 xs:h-98 zm:w-80 zm:h-108 sm:w-100 sm:h-128 object-cover select-none pointer-events-none transition-all duration-1000"
                        />
                    </div>
                )}

                {mode === "pixelated" && (
                    <div className="w-full max-w-md px-4 mb-10 flex flex-col items-center gap-6">
                        <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-2xl overflow-hidden border-2 border-white/20">
                            <PixelatedCanvas imageUrl={coverUrl} blockSize={won ? PIXEL_LEVELS[PIXEL_LEVELS.length - 1] : GetPixelLevel(attempts)} alt="Pixelated album cover" className="w-full h-full object-cover block" />
                        </div>
                        <PixelatedHints guessCount={attempts} releaseYear={puzzle.release_year ?? 0} artistName={puzzle.group_name ?? ""} persist={false} />
                    </div>
                )}

                {!won && (
                    <div className="w-full flex flex-col items-center mb-6">
                        <span className="text-[14px] sm:text-[16px] text-[#d7d7d7]/85 mb-1">Guess this day's {mode === "pixelated" ? "album" : "idol"}...</span>
                        <div className="relative w-full max-w-4xl px-4 mx-auto flex justify-center z-40">
                            {mode === "pixelated" ? (
                                <PixelatedSearchBar
                                    allAlbums={albums.data ?? []}
                                    value={value}
                                    onAlbumSelect={setValue}
                                    onAlbumSelectId={(album) => setSelected(album.id)}
                                    onSubmit={submit}
                                    excludedAlbums={albumGuesses.map((g) => g.album_id)}
                                    disabled={guess.isPending}
                                />
                            ) : (
                                <SearchBar
                                    allIdols={mode === "blurry" ? blurIdols : allIdolsData ?? NO_IDOLS}
                                    value={value}
                                    onIdolSelect={setValue}
                                    onIdolSelectId={(idol) => setSelected(idol.id)}
                                    onSubmit={submit}
                                    excludedIdols={guessedIdolIds}
                                    disabled={guess.isPending}
                                    gameMode={mode}
                                />
                            )}
                        </div>
                        {guess.isError && <p role="alert" className="mt-3 text-[#fd5c63] font-semibold">That guess didn't go through. Try again.</p>}
                    </div>
                )}

                {won && (
                    <div className="w-full max-w-md px-4 mb-10 flex flex-col items-center gap-3 text-center" role="status">
                        <p className="m-0 text-2xl font-bold text-white">You found it!</p>
                        {day.data.answer && (
                            <p className="m-0 text-white/85 font-semibold">{day.data.answer.artist_name ?? day.data.answer.album_name}</p>
                        )}
                        {day.data.xp !== null && <p className="m-0 text-neon-pink font-bold">{`+${day.data.xp} XP`}</p>}
                        <Link to={`/calendar?mode=${mode}&date=${date}`} className="mt-2 px-5 py-2.5 rounded-2xl bg-white text-black font-bold hover:brightness-90">Back to the calendar</Link>
                        {cardGranted && <CardGrantedReveal cardGranted={cardGranted} />}
                    </div>
                )}

                <div className="w-full flex items-center justify-center">
                    {mode === "classic" && <GuessesGrid guesses={idolGuesses as GuessResponse[]} allIdols={allIdolsData} onAllAnimationsComplete={() => {}} persist={false} />}
                    {mode === "blurry" && <BlurryGuessGrid guesses={idolGuesses} persist={false} />}
                    {mode === "pixelated" && <PixelatedGuessGrid guesses={albumGuesses} persist={false} />}
                </div>
            </div>
        </>
    );
}
