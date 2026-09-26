# An idol's current career rows are her active `idol_career` rows. An idol with no
# active row (left her group, hasn't joined a new one or debuted solo) falls back to
# her most recent past group, so she keeps showing it.

CURRENT_CAREER_CTE = """
    current_career AS (
        SELECT ic.*, FALSE AS is_former_group
        FROM idol_career AS ic
        WHERE ic.is_active = TRUE

        UNION ALL

        SELECT past.*, TRUE AS is_former_group
        FROM (
            SELECT DISTINCT ON (ic.idol_id) ic.*
            FROM idol_career AS ic
            WHERE NOT EXISTS (
                SELECT 1 FROM idol_career AS active
                WHERE active.idol_id = ic.idol_id AND active.is_active = TRUE
            )
            ORDER BY ic.idol_id, ic.end_year DESC NULLS LAST,
                     ic.start_year DESC NULLS LAST, ic.group_id ASC
        ) AS past
    )
"""


class IdolRepository:
    def __init__(self, cursor):
        self.cursor = cursor

    def fetch_full_idol_data(self, idol_id):
        """Fetch full idol data from the database"""  
        sql_query = f"""
            WITH {CURRENT_CAREER_CTE}
            SELECT
                i.id AS idol_id,
                i.artist_name,
                i.real_name,
                i.gender,
                i.debut_year AS idol_debut_year,
                i.nationality,
                i.birth_date,
                i.position,
                i.height,
                i.image_path,
                i.image_version,
                i.is_published,
                g.id AS group_id,
                g.name AS group_name,
                g.group_debut_year,
                g.member_count,
                g.generation,
                g.fandom_name,
                COALESCE(cc.is_former_group, FALSE) AS is_former_group
            FROM idols AS i
            -- Current group (falls back to the most recent past group, see CURRENT_CAREER_CTE)
            LEFT JOIN current_career AS cc ON i.id = cc.idol_id
            -- Join with groups table to get actual group data
            LEFT JOIN groups AS g ON cc.group_id = g.id
            WHERE i.id = %s AND i.is_published = TRUE
            -- Multi-group idols: lowest group id is the main one
            ORDER BY g.id ASC
            LIMIT 1
        """
        self.cursor.execute(sql_query, (idol_id,))
        return self.cursor.fetchone()

    def fetch_full_idol_career(self, idol_id):
        """Fetch full idol career data from the database"""
        sql_query = """
            SELECT
                ic.is_active,
                ic.start_year,
                ic.end_year,
                g.name AS group_name
            FROM idol_career AS ic
            JOIN groups AS g ON ic.group_id = g.id
            WHERE ic.idol_id = %s
            ORDER BY ic.start_year ASC
        """
        self.cursor.execute(sql_query, (idol_id,))
        return self.cursor.fetchall()

    def fetch_group_companies(self, group_id):
        """Fetch group's companies from the database"""
        sql_query = """
            SELECT
                c.name,
                c.parent_company_id,
                gca.role
            FROM companies AS c
            JOIN group_company_affiliation AS gca ON c.id = gca.company_id
            WHERE gca.group_id = %s
        """
        self.cursor.execute(sql_query, (group_id,))
        return self.cursor.fetchall()

    def fetch_idol_companies(self, idol_id):
        """Fetch idol's companies from the database"""
        sql_query = """
            SELECT
                c.name,
                c.parent_company_id
            FROM companies AS c
            JOIN idol_company_affiliation AS ica ON c.id = ica.company_id
            WHERE ica.idol_id = %s
        """
        self.cursor.execute(sql_query, (idol_id,))
        return self.cursor.fetchall()

    def fetch_blurry_idol_data(self, idol_id):
        """Fetch idol data for blurry game mode from the database"""
        sql_query = """
            SELECT
                i.id AS idol_id,
                i.artist_name,
                i.image_path,
                i.image_version,
                b.blur_image_path,
                b.blur_image_version
            FROM idols AS i
            INNER JOIN blurry_mode_data AS b ON i.id = b.idol_id AND b.is_active = TRUE
            WHERE i.id = %s AND i.is_published = TRUE
        """

        self.cursor.execute(sql_query, (idol_id,))
        return self.cursor.fetchone()
    