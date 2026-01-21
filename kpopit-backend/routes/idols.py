from flask import Blueprint, jsonify
from services.get_db import get_db

idol_bp = Blueprint('idols', __name__)

# Create idol list (For frontend check, list, dropdown...)
@idol_bp.route("/idols-list", methods=["GET"])
def get_idols_list():
    """Return a list of all idols with their id and names as JSON"""
    
    # Start db connection
    connect = get_db()
    cursor = connect.cursor()

    # Fetch all idols data
    idol_query = """
        SELECT DISTINCT
            i.id,
            i.artist_name, 
            i.image_path,
            i.gender,
            i.debut_year AS idol_debut_year,
            i.nationality,
            i.birth_date,
            i.height,
            i.position,
            b.blur_image_path
            FROM idols AS i
            LEFT JOIN blurry_mode_data AS b ON i.id = b.idol_id AND b.is_active = 1
            WHERE i.is_published = 1 
            ORDER BY artist_name ASC
    """
    cursor.execute(idol_query)
    results = cursor.fetchall()

    idols_list = [dict(row) for row in results]

    member_count_query = """
            SELECT ic.idol_id, g.member_count
            FROM idol_career AS ic
            JOIN groups AS g ON ic.group_id = g.id
            JOIN (
                -- Subquery to get the first / main group for each idol
                SELECT idol_id, MIN(start_year) as first_start_year
                FROM idol_career
                WHERE is_active = 1
                GROUP BY idol_id
            ) AS main_group
            ON ic.idol_id = main_group.idol_id
            AND ic.start_year = main_group.first_start_year
            WHERE ic.is_active = 1
    """
    cursor.execute(member_count_query)
    member_count_results = cursor.fetchall()

    idol_member_counts = {row["idol_id"]: row["member_count"] for row in member_count_results}

    groups_query = """
        SELECT ic.idol_id, g.name AS group_name
        FROM idol_career AS ic
        JOIN groups AS g ON ic.group_id = g.id
        WHERE ic.is_active = 1
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

    companies_query = """
        SELECT
            ic.idol_id,
            c.name AS company_name
            FROM idol_company_affiliation AS ic
            JOIN companies AS c ON ic.company_id = c.id

        UNION

        SELECT
            icar.idol_id,
            c.name AS company_name
            FROM idol_career AS icar
            JOIN group_company_affiliation AS gca ON icar.group_id = gca.group_id
            JOIN companies AS c ON gca.company_id = c.id
            WHERE icar.is_active = 1
        """
    cursor.execute(companies_query)
    results = cursor.fetchall()

    idol_companies = {}
    for row in results:
        idol_companies.setdefault(row["idol_id"], []).append(row["company_name"])

    for idol in idols_list:
        idol_id = idol["id"]
        idol["groups"] = list(set(idol_groups_all.get(idol_id, [])))
        idol["all_groups"] = idol["groups"]
        idol["active_group"] = ", ".join(set(idol_groups_active.get(idol_id, []))) or None
        idol["companies"] = list(set(idol_companies.get(idol_id, [])))
        idol["member_count"] = idol_member_counts.get(idol_id)

        for field in ["nationality", "position"]:
            if field in idol and isinstance(idol[field], str) and idol[field]:
                idol[field] = [item.strip() for item in idol[field].split(",")]
            elif field not in idol or idol[field] is None:
                idol[field] = []

    

    return jsonify(idols_list)

