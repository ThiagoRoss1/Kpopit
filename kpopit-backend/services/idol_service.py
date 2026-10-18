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

    def get_search_list(self, cursor) -> list[dict]:
        """Every published idol with the attributes Classic/Blurry search and feedback use (/idols-list)."""
        # Fetch all idols data
        idol_query = """
            SELECT DISTINCT
                i.id,
                i.artist_name, 
                i.image_path,
                i.image_version,
                i.gender,
                i.debut_year AS idol_debut_year,
                i.nationality,
                i.birth_date,
                i.height,
                i.position,
                b.blur_image_path,
                b.blur_image_version
                FROM idols AS i
                LEFT JOIN blurry_mode_data AS b ON i.id = b.idol_id AND b.is_active = TRUE
                WHERE i.is_published = TRUE
                ORDER BY artist_name ASC
        """
        cursor.execute(idol_query)
        idols_list = cursor.fetchall()

        member_count_query = f"""
                WITH {CURRENT_CAREER_CTE}
                SELECT cc.idol_id, g.member_count
                FROM current_career AS cc
                JOIN groups AS g ON cc.group_id = g.id
                JOIN (
                    -- Subquery to get the first / main group for each idol
                    SELECT idol_id, MIN(start_year) as first_start_year
                    FROM current_career
                    GROUP BY idol_id
                ) AS main_group
                ON cc.idol_id = main_group.idol_id
                AND cc.start_year = main_group.first_start_year
        """
        cursor.execute(member_count_query)
        member_count_results = cursor.fetchall()

        idol_member_counts = {row["idol_id"]: row["member_count"] for row in member_count_results}

        groups_query = f"""
            WITH {CURRENT_CAREER_CTE}
            SELECT cc.idol_id, g.name AS group_name
            FROM current_career AS cc
            JOIN groups AS g ON cc.group_id = g.id
        """
        cursor.execute(groups_query)
        results = cursor.fetchall()

        idol_groups_active = {}

        for row in results:
            idol_groups_active.setdefault(row["idol_id"], []).append(row["group_name"])

        groups_query_all = """
            SELECT ic.idol_id, g.name AS group_name
            FROM idol_career AS ic
            JOIN groups AS g ON ic.group_id = g.id
        """
        cursor.execute(groups_query_all)
        results = cursor.fetchall()

        idol_groups_all = {}
        for row in results:
            idol_groups_all.setdefault(row["idol_id"], []).append(row["group_name"])

        companies_query = f"""
            WITH {CURRENT_CAREER_CTE}
            SELECT
                ic.idol_id,
                c.name AS company_name
                FROM idol_company_affiliation AS ic
                JOIN companies AS c ON ic.company_id = c.id

            UNION

            SELECT
                icar.idol_id,
                c.name AS company_name
                FROM current_career AS icar
                JOIN group_company_affiliation AS gca ON icar.group_id = gca.group_id
                JOIN companies AS c ON gca.company_id = c.id
            """
        cursor.execute(companies_query)
        results = cursor.fetchall()

        idol_companies = {}
        for row in results:
            idol_companies.setdefault(row["idol_id"], []).append(row["company_name"])

        for idol in idols_list:
            idol_id = idol["id"]
            # sorted(): a bare set() follows per-process string hashing, so each worker answered
            # with a different order ("TWICE, MISAMO" vs "MISAMO, TWICE").
            idol["groups"] = sorted(set(idol_groups_all.get(idol_id, [])))
            idol["all_groups"] = idol["groups"]
            idol["active_group"] = ", ".join(sorted(set(idol_groups_active.get(idol_id, [])))) or None
            idol["companies"] = sorted(set(idol_companies.get(idol_id, [])))
            idol["member_count"] = idol_member_counts.get(idol_id)

            for field in ["nationality", "position"]:
                if field in idol and isinstance(idol[field], str) and idol[field]:
                    idol[field] = [item.strip() for item in idol[field].split(",")]
                elif field not in idol or idol[field] is None:
                    idol[field] = []

        return idols_list
