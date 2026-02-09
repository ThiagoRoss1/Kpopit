def fetch_full_idol_data(cursor, idol_id):
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
    cursor.execute(sql_query, (idol_id,))
    return cursor.fetchone()

def fetch_full_idol_career(cursor, idol_id):
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
    cursor.execute(sql_query, (idol_id,))
    results = cursor.fetchall()
    # Convert Row objects to dictionaries
    return [dict(row) for row in results]


def fetch_group_companies(cursor, group_id):
    """Fetch group's companies from the database"""
    sql_query = """
        SELECT
            c.name,
            c.parent_company_id
        FROM companies AS c
        JOIN group_company_affiliation AS gca ON c.id = gca.company_id
        WHERE gca.group_id = ?
    """
    cursor.execute(sql_query, (group_id,))
    results = cursor.fetchall()
    # Convert Row objects to dictionaries
    return [dict(row) for row in results]


def fetch_idol_companies(cursor, idol_id):
    """Fetch idol's companies from the database"""
    sql_query = """
        SELECT
            c.name,
            c.parent_company_id
        FROM companies AS c
        JOIN idol_company_affiliation AS ica ON c.id = ica.company_id
        WHERE ica.idol_id = ?
    """
    cursor.execute(sql_query, (idol_id,))
    results = cursor.fetchall()
    # Convert Row objects to dictionaries
    return [dict(row) for row in results]