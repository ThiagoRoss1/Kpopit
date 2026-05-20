import type { RestoreSessionResponse } from "../interfaces/gameInterfaces";

const writeBool = (key: string, value: boolean | undefined) => {
    if (value === undefined) return;
    localStorage.setItem(key, value ? "true" : "false");
};

const writeJson = (key: string, value: unknown) => {
    if (value === undefined || value === null) return;
    localStorage.setItem(key, JSON.stringify(value));
};

const mergeAnimatedIdols = (key: string, serverList: unknown) => {
    if (!Array.isArray(serverList)) return;
    let local: unknown[] = [];
    try {
        const raw = localStorage.getItem(key);
        if (raw) local = JSON.parse(raw);
    } catch {
        local = [];
    }
    const localArr = Array.isArray(local) ? local : [];
    const merged = Array.from(new Set([...localArr, ...serverList]));
    localStorage.setItem(key, JSON.stringify(merged));
};

export const applyRestoredSession = (payload: RestoreSessionResponse) => {
    const { classic, blurry, server_date } = payload;

    if (classic) {
        writeJson("todayGuessesDetails", classic.today_guesses_details);
        writeJson("GuessedIdols", classic.guessed_idols);
        mergeAnimatedIdols("animatedIdols", classic.animated_idols);

        writeBool("gameComplete", classic.game_complete);
        writeBool("gameWon", classic.game_won);

        writeBool("hint1Revealed", classic.hints_revealed?.hint1);
        writeBool("hint2Revealed", classic.hints_revealed?.hint2);
        writeBool("showHint1", classic.show_hints?.hint1);
        writeBool("showHint2", classic.show_hints?.hint2);
        writeBool("colorize1", classic.colorize_hints?.hint1);
        writeBool("colorize2", classic.colorize_hints?.hint2);
    }

    if (blurry) {
        writeJson("blurryGuessesDetails", blurry.blurry_guesses_details);
        writeJson("blurryGuessedIdols", blurry.guessed_idols);

        writeBool("blurryGameComplete", blurry.game_complete);
        writeBool("blurryGameWon", blurry.game_won);
    }

    if (server_date) {
        localStorage.setItem("gameDate", server_date);
        localStorage.setItem("blurryGameDate", server_date);
    }

    window.dispatchEvent(new Event("session-restored"));
};
