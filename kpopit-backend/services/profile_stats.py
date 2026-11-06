from datetime import date, timedelta
from repositories.idol_repository import CURRENT_CAREER_CTE

MODE_KEYS = {1: "classic", 2: "blurry", 3: "pixelated"}
IDOL_MODES = (1, 2)
DISTRIBUTION_BUCKETS = 8  # the last bucket holds 8 guesses and more
WEEKS, MONTHS = 16, 12
TOP_GROUPS, TOP_IDOLS = 5, 5

# One group per idol: the first current group, else the latest past one (see CURRENT_CAREER_CTE).
PRIMARY_GROUP_CTE = CURRENT_CAREER_CTE + """,
    primary_group AS (
        SELECT DISTINCT ON (idol_id) idol_id, group_id
        FROM current_career ORDER BY idol_id, is_former_group, group_id
    )
"""


def _run_lengths(days: list[date]) -> list[tuple[date, int]]:
    """(last day, length) of every run of consecutive days in a sorted, distinct list."""
    runs: list[tuple[date, int]] = []
    for day in days:
        if runs and runs[-1][0] == day - timedelta(days=1):
            runs[-1] = (day, runs[-1][1] + 1)
        else:
            runs.append((day, 1))
    return runs


def streaks(win_days: list[date], today: date) -> tuple[int, int]:
    """(current, max) streak of live wins. The current one is still alive until a whole day is missed,
    so a run ending yesterday counts while today isn't won yet."""
    runs = _run_lengths(sorted(set(win_days)))
    longest = max((length for _, length in runs), default=0)
    current = next((length for end, length in reversed(runs) if end >= today - timedelta(days=1)), 0)
    return current, longest


def _week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def _month_start(day: date, back: int = 0) -> date:
    index = day.year * 12 + day.month - 1 - back
    return date(index // 12, index % 12 + 1, 1)


def _summary(rows: list[dict], today: date) -> dict:
    """Tiles, guess distribution and win rate over time for one set of games."""
    wins = [row for row in rows if row["won"]]
    distribution = [0] * DISTRIBUTION_BUCKETS
    for row in wins:
        distribution[min(max(row["guesses_count"], 1), DISTRIBUTION_BUCKETS) - 1] += 1
    # Backfill rows have no trustworthy started_at, so they never set the fastest win.
    durations = [(row["won_at"] - row["started_at"]).total_seconds() for row in wins
                 if row["started_at"] and row["won_at"] and row["guesses_origin"] != "backfill"
                 and row["won_at"] >= row["started_at"]]
    weeks = [_week_start(today) - timedelta(weeks=n) for n in range(WEEKS - 1, -1, -1)]
    months = [_month_start(today, n) for n in range(MONTHS - 1, -1, -1)]
    weekly = {start: [0, 0] for start in weeks}
    monthly = {start: [0, 0] for start in months}
    for row in rows:
        for buckets, start in ((weekly, _week_start(row["date"])), (monthly, _month_start(row["date"]))):
            if start in buckets:
                buckets[start][0] += 1
                buckets[start][1] += bool(row["won"])
    return {
        "played": len(rows),
        "wins": len(wins),
        "win_rate": round(len(wins) * 100 / len(rows)) if rows else 0,
        "avg_guesses": round(sum(row["guesses_count"] for row in wins) / len(wins), 1) if wins else None,
        "one_shots": sum(1 for row in wins if row["one_shot_win"]),
        "fastest_seconds": int(min(durations)) if durations else None,
        "distribution": distribution,
        "weekly": [{"start": start.isoformat(), "played": p, "wins": w} for start, (p, w) in weekly.items()],
        "monthly": [{"start": start.isoformat(), "played": p, "wins": w} for start, (p, w) in monthly.items()],
    }


class ProfileStats:
    """A player's stats, straight from daily_user_history (no summary tables). Calendar games count in
    played/wins/rates, never in streaks; only days up to today count."""

    def games(self, cursor, user_id: int, today: date) -> list[dict]:
        cursor.execute(
            """
                SELECT date, gamemode_id, won, guesses_count, one_shot_win, is_calendar, started_at, won_at,
                       guesses_origin
                FROM daily_user_history
                WHERE user_id = %s AND date <= %s AND COALESCE(guesses_count, 0) > 0
            """, (user_id, today),
        )
        return cursor.fetchall()

    def guess_shares(self, cursor, user_id: int, last_day: date) -> tuple[list[dict], list[dict]]:
        """(guesses per mode and group, guesses per idol mode and idol) up to last_day. Idol modes map an
        idol to its group; Pixelated maps the guessed album to its artist's group."""
        cursor.execute(
            f"""
                WITH {PRIMARY_GROUP_CTE},
                guesses AS (
                    SELECT h.gamemode_id, gid
                    FROM daily_user_history h CROSS JOIN LATERAL unnest(h.guessed_ids) AS gid
                    WHERE h.user_id = %s AND h.date <= %s
                )
                SELECT gs.gamemode_id, g.name, COUNT(*) AS guesses
                FROM guesses gs
                LEFT JOIN primary_group pg ON gs.gamemode_id IN (1, 2) AND pg.idol_id = gs.gid
                LEFT JOIN albums al ON gs.gamemode_id = 3 AND al.id = gs.gid
                JOIN groups g ON g.id = COALESCE(pg.group_id, al.group_id)
                GROUP BY gs.gamemode_id, g.name
            """, (user_id, last_day),
        )
        groups = cursor.fetchall()
        cursor.execute(
            f"""
                WITH {PRIMARY_GROUP_CTE}
                SELECT h.gamemode_id, i.id AS idol_id, i.artist_name, i.image_path, g.name AS group_name,
                       COUNT(*) AS guesses
                FROM daily_user_history h
                CROSS JOIN LATERAL unnest(h.guessed_ids) AS gid
                JOIN idols i ON i.id = gid
                LEFT JOIN primary_group pg ON pg.idol_id = i.id
                LEFT JOIN groups g ON g.id = pg.group_id
                WHERE h.user_id = %s AND h.date <= %s AND h.gamemode_id IN (1, 2)
                GROUP BY h.gamemode_id, i.id, i.artist_name, i.image_path, g.name
            """, (user_id, last_day),
        )
        return groups, cursor.fetchall()

    def stats(self, cursor, user_id: int, today: date, include_today_guesses: bool) -> dict:
        """Per mode and in total. A visitor's guess shares stop at yesterday, so today's guesses can't
        hint at today's answer."""
        rows = self.games(cursor, user_id, today)
        last_day = today if include_today_guesses else today - timedelta(days=1)
        group_rows, idol_rows = self.guess_shares(cursor, user_id, last_day)

        result = {}
        best_current = (0, None)
        best_max = 0
        for gamemode_id, key in MODE_KEYS.items():
            mode_rows = [row for row in rows if row["gamemode_id"] == gamemode_id]
            win_days = [row["date"] for row in mode_rows if row["won"] and not row["is_calendar"]]
            current, longest = streaks(win_days, today)
            if current > best_current[0]:
                best_current = (current, key)
            best_max = max(best_max, longest)
            result[key] = {
                **_summary(mode_rows, today),
                "current_streak": current,
                "max_streak": longest,
                "groups": self._top_groups([row for row in group_rows if row["gamemode_id"] == gamemode_id]),
                "most_guessed": self._top_idols([row for row in idol_rows if row["gamemode_id"] == gamemode_id]),
            }
        result["all"] = {
            **_summary(rows, today),
            "current_streak": best_current[0],
            "current_streak_mode": best_current[1],
            "max_streak": best_max,
            "groups": self._top_groups(group_rows),
            "most_guessed": self._top_idols(idol_rows),
        }
        return result

    def _top_groups(self, rows: list[dict]) -> list[dict]:
        totals: dict[str, int] = {}
        for row in rows:
            totals[row["name"]] = totals.get(row["name"], 0) + row["guesses"]
        ranked = sorted(totals.items(), key=lambda item: (-item[1], item[0]))
        top = [{"name": name, "guesses": count} for name, count in ranked[:TOP_GROUPS]]
        rest = sum(count for _, count in ranked[TOP_GROUPS:])
        return top + ([{"name": None, "guesses": rest}] if rest else [])

    def _top_idols(self, rows: list[dict]) -> list[dict]:
        totals: dict[int, dict] = {}
        for row in rows:
            entry = totals.setdefault(row["idol_id"], {
                "idol_id": row["idol_id"], "artist_name": row["artist_name"], "image_path": row["image_path"],
                "group_name": row["group_name"], "guesses": 0,
            })
            entry["guesses"] += row["guesses"]
        return sorted(totals.values(), key=lambda item: (-item["guesses"], item["artist_name"]))[:TOP_IDOLS]
