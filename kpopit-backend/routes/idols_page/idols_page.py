from flask import Blueprint, jsonify
from services.get_db import get_db
from repositories.idol_repository import IdolRepository

idols_page_bp = Blueprint('idols_page', __name__)

@idols_page_bp.route("/idols-page", methods=["GET"])
def get_idols_page():
    """Return a list of all idols in game as JSON"""

    with get_db() as connect:
        with connect.cursor() as cursor:
            try:
                # Not using IdolRepository here because we just need a simple list for the general page
                idol_page_query = """
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
                        (SELECT STRING_AGG(DISTINCT g2.name, ', ')
                            FROM idol_career AS ic2
                            JOIN groups AS g2 ON ic2.group_id = g2.id
                            WHERE ic2.idol_id = i.id) AS all_groups
                    FROM idols AS i
                    LEFT JOIN idol_career AS ic ON i.id = ic.idol_id AND ic.is_active = TRUE
                    LEFT JOIN groups AS g ON g.id = ic.group_id
                    LEFT JOIN group_company_affiliation AS gca ON gca.group_id = g.id
                    LEFT JOIN companies AS c ON c.id = gca.company_id
                    WHERE i.is_published = TRUE
                    ORDER BY i.id ASC, g.id ASC, gca.role DESC
                """
                cursor.execute(idol_page_query)
                return jsonify(cursor.fetchall())

            except Exception as e:
                print(f"Error fetching idols page data: {e}")
                return jsonify({"error": str(e)}), 500
        
@idols_page_bp.route("/idols-page/<int:idol_id>", methods=["GET"])
def get_idols_page_idol(idol_id):
    """Return detailed information about a specific idol by ID as JSON"""

    with get_db() as connect:
        with connect.cursor() as cursor:
            try:
                # Here we can use the IdolRepository to fetch detailed idol data
                idol_repo = IdolRepository(cursor)

                idol_data = idol_repo.fetch_full_idol_data(idol_id)

                if not idol_data:
                    return jsonify({"error": "Idol not found"}), 404
                
                idol_career = idol_repo.fetch_full_idol_career(idol_id)

                group_id = idol_data.get("group_id") if idol_data else None

                idol_companies = idol_repo.fetch_idol_companies(idol_id)
                group_companies = idol_repo.fetch_group_companies(group_id) if idol_career else []

                # Check which modes idol is in and add that to the response
                # Classic will always be true
                game_modes = {
                    "Classic": True,
                }

                cursor.execute(
                    """ 
                        SELECT i.id FROM idols AS i
                        INNER JOIN blurry_mode_data AS bi ON bi.idol_id = i.id
                        WHERE i.id = %s 
                        AND bi.is_active = TRUE
                    """, (idol_id,))
                
                game_modes["Blurry"] = cursor.fetchone() is not None 

                if idol_data:
                    
                    idol_profile = {
                        "idol_id": idol_data.get("idol_id"),
                        "artist_name": idol_data.get("artist_name"),
                        "real_name": idol_data.get("real_name"),
                        "birth_date": idol_data.get("birth_date"),
                        "nationality": idol_data.get("nationality"),
                        "height": idol_data.get("height"),
                        "position": idol_data.get("position"),
                        "image_path": idol_data.get("image_path"),
                        "image_version": idol_data.get("image_version")
                    }

                    idol_career = {
                        "group_name": idol_data.get("group_name"),
                        "idol_debut_year": idol_data.get("idol_debut_year"),
                        "fandom_name": idol_data.get("fandom_name"),
                        "idol_companies": idol_companies,
                        "group_companies": group_companies,
                        "idol_career": idol_career
                    }

                    game_info = {
                        "game_modes_available": game_modes
                    }

                    response = {
                        "idol_profile": idol_profile,
                        "idol_career": idol_career,
                        "game_info": game_info
                    }

                    # past response with everything 
                    # response = {
                    #     "idol_data": idol_data,
                    #     "idol_career": idol_career,
                    #     "idol_companies": idol_companies,
                    #     "group_companies": group_companies,
                    #     "game_modes_available": game_modes
                    # }

                return jsonify(response)
            
            except Exception as e:
                print(f"Error fetching idol data: {str(e)}")
                return jsonify({"error": "Internal Server Error"}), 500
            