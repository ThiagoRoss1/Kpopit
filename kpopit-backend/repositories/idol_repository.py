class IdolRepository:
    def __init__(self, cursor):
        self.cursor = cursor

    def fetch_full_idol_data(self, idol_id):
        """Fetch full idol data from the database"""  
        sql_query = """
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
                i.is_published,
                g.id AS group_id,
                g.name AS group_name,
                g.group_debut_year,
                g.member_count,
                g.generation,
                g.fandom_name
            FROM idols AS i
            -- Join with idol career to get current group
            LEFT JOIN idol_career AS ic ON i.id = ic.idol_id AND ic.is_active = 1
            -- Join with groups table to get actual group data
            LEFT JOIN groups AS g ON ic.group_id = g.id
            WHERE i.id = ? AND i.is_published = 1
        """
        self.cursor.execute(sql_query, (idol_id,))
        row = self.cursor.fetchone()
        return dict(row) if row else None

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
            WHERE ic.idol_id = ?
            ORDER BY ic.start_year ASC
        """
        self.cursor.execute(sql_query, (idol_id,))
        results = self.cursor.fetchall()
        # Convert Row objects to dictionaries
        return [dict(row) for row in results]


    def fetch_group_companies(self, group_id):
        """Fetch group's companies from the database"""
        sql_query = """
            SELECT
                c.name,
                c.parent_company_id
            FROM companies AS c
            JOIN group_company_affiliation AS gca ON c.id = gca.company_id
            WHERE gca.group_id = ?
        """
        self.cursor.execute(sql_query, (group_id,))
        results = self.cursor.fetchall()
        # Convert Row objects to dictionaries
        return [dict(row) for row in results]


    def fetch_idol_companies(self, idol_id):
        """Fetch idol's companies from the database"""
        sql_query = """
            SELECT
                c.name,
                c.parent_company_id
            FROM companies AS c
            JOIN idol_company_affiliation AS ica ON c.id = ica.company_id
            WHERE ica.idol_id = ?
        """
        self.cursor.execute(sql_query, (idol_id,))
        results = self.cursor.fetchall()
        # Convert Row objects to dictionaries
        return [dict(row) for row in results]
    
    def fetch_blurry_idol_data(self, idol_id):
        """Fetch idol data for blurry game mode from the database"""
        sql_query = """
            SELECT
                i.id AS idol_id,
                i.artist_name,
                i.image_path,
                b.blur_image_path
            FROM idols AS i
            LEFT JOIN blurry_mode_data AS b ON i.id = b.idol_id
            WHERE i.id = ? AND i.is_published = 1
        """

        self.cursor.execute(sql_query, (idol_id,))
        row = self.cursor.fetchone()
        return dict(row) if row else None
