from repositories.idol_repository import IdolRepository, CURRENT_CAREER_CTE


class IdolService:
    """Read-only idol catalog for the public idol pages."""

    def __init__(self, db):
        self.db = db

    def get_idols_page(self, cursor) -> list[dict]:
        """Every published idol with its current group and company, for /idols."""
        cursor.execute(f"""
            WITH {CURRENT_CAREER_CTE}
            SELECT DISTINCT ON (i.id)
                i.id,
                i.artist_name,
                i.image_path,
                i.image_version,
                i.is_published,
                g.id AS group_id,
                g.name AS group_name,
                c.id AS company_id,
                c.name AS company_name,
                COALESCE(cc.is_former_group, FALSE) AS is_former_group,
                (SELECT STRING_AGG(DISTINCT g2.name, ', ' ORDER BY g2.name)
                    FROM idol_career AS ic2
                    JOIN groups AS g2 ON ic2.group_id = g2.id
                    WHERE ic2.idol_id = i.id) AS all_groups
            FROM idols AS i
            -- Current group (falls back to the most recent past group, see CURRENT_CAREER_CTE)
            LEFT JOIN current_career AS cc ON i.id = cc.idol_id
            LEFT JOIN groups AS g ON g.id = cc.group_id
            LEFT JOIN group_company_affiliation AS gca ON gca.group_id = g.id
            LEFT JOIN companies AS c ON c.id = gca.company_id
            WHERE i.is_published = TRUE
            ORDER BY i.id ASC, g.id ASC, gca.role DESC
        """)
        return cursor.fetchall()

    def get_idol_profile(self, cursor, idol_id: int) -> dict | None:
        """Profile, career and game modes of one idol for /idols/:id/:slug, or None if unknown."""
        idol_repo = IdolRepository(cursor)

        idol_data = idol_repo.fetch_full_idol_data(idol_id)
        if not idol_data:
            return None

        idol_career = idol_repo.fetch_full_idol_career(idol_id)
        group_id = idol_data.get("group_id")
        idol_companies = idol_repo.fetch_idol_companies(idol_id)
        is_former_group = idol_data.get("is_former_group", False)
        group_companies = idol_repo.fetch_group_companies(group_id) if idol_career else []

        # Classic always has every idol; Blurry only those with an active blurry image.
        game_modes = {"Classic": True}
        cursor.execute(
            """
                SELECT i.id FROM idols AS i
                INNER JOIN blurry_mode_data AS bi ON bi.idol_id = i.id
                WHERE i.id = %s
                AND bi.is_active = TRUE
            """, (idol_id,))
        game_modes["Blurry"] = cursor.fetchone() is not None

        return {
            "idol_profile": {
                "idol_id": idol_data.get("idol_id"),
                "artist_name": idol_data.get("artist_name"),
                "real_name": idol_data.get("real_name"),
                "birth_date": idol_data.get("birth_date"),
                "nationality": idol_data.get("nationality"),
                "height": idol_data.get("height"),
                "position": idol_data.get("position"),
                "image_path": idol_data.get("image_path"),
                "image_version": idol_data.get("image_version"),
            },
            "idol_career": {
                "group_name": idol_data.get("group_name"),
                "idol_debut_year": idol_data.get("idol_debut_year"),
                "is_former_group": is_former_group,
                "fandom_name": idol_data.get("fandom_name"),
                "idol_companies": idol_companies,
                "group_companies": group_companies,
                "idol_career": idol_career,
            },
            "game_info": {
                "game_modes_available": game_modes,
            },
        }
