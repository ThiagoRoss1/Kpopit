from datetime import datetime
import logging
import os

COLLECTION_ENABLED = os.getenv("COLLECTION_ENABLED", "false").lower() == "true"
COLLECTION_GAMEMODE_IDS = (1, 2)

logger = logging.getLogger(__name__)

class CollectionService:
    """Service class for managing collections."""
    LEVEL_CAP = 3 # Maximum level for a card

    def __init__(self, db):
        self.db = db

    def grant_card_for_win(self, cursor, user_id: int, idol_id:int, won_at: datetime, collection_id=1) -> dict | None:
        """Grants a collection card to a user. If the user already has the card, it upgrades the level instead."""
        # Check if the user already has the card
        cursor.execute(
            """
                SELECT id FROM cards
                WHERE collection_id = %s AND idol_id = %s AND card_type = 'idol'
            """, (collection_id, idol_id)
        )
        card_row = cursor.fetchone()
        if not card_row:
            return None
        
        card_id = card_row["id"]

        insert_new = self._insert_new_card(cursor, user_id, card_id, won_at)
        if insert_new:
            result = {
                "card_id": card_id, "is_new": True,
                "level": insert_new["level"], "times_won": insert_new["times_won"]
            }

        else:
            upgraded = self._upgrade_card_level(cursor, user_id, card_id, self.LEVEL_CAP)
            if not upgraded:
                logger.warning(
                    "grant_card_for_win: Card exists in catalog but UPDATE found no row "
                    "(user_id=%s, card_id=%s) - Inconsistent state", user_id, card_id
                )
                return None
            result = {
                "card_id": card_id, "is_new": False,
                "level": upgraded["level"], "times_won": upgraded["times_won"]
            }

        result["group_photo"] = self._grant_completed_group_photos(cursor, user_id, idol_id, won_at, collection_id)

        return result
        
    
    def _insert_new_card(self, cursor, user_id: int, card_id: int, first_won_at: datetime) -> dict | None:
        """Inserts a new user_cards row. Returns None if the row already exists (ON CONFLICT DO NOTHING)."""
        cursor.execute(
            """
                INSERT INTO user_cards (user_id, card_id, first_won_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, card_id) DO NOTHING
                RETURNING id, level, times_won
            """, (user_id, card_id, first_won_at)
        )

        return cursor.fetchone()
    
    def _upgrade_card_level(self, cursor, user_id: int, card_id: int, level_cap: int = LEVEL_CAP) -> dict | None:
        """Upgrades the level of a user's collection card."""
        cursor.execute(
            """
                UPDATE user_cards
                SET level = LEAST(level + 1, %s),
                    times_won = times_won + 1
                WHERE user_id = %s AND card_id = %s
                RETURNING id, level, times_won    
            """, (level_cap, user_id, card_id)
        )

        return cursor.fetchone()
    
    def _get_completed_group_ids(self, cursor, user_id: int, idol_id: int, collection_id: int = 1) -> list[int]:
        """Returns the ids of the idol's bonus-eligible groups where the user owns every idol card."""
        cursor.execute(
            """
                SELECT cge.group_id
                FROM collection_group_eligibility AS cge
                JOIN idol_career AS ic ON ic.group_id = cge.group_id
                JOIN cards AS c ON c.collection_id = cge.collection_id
                    AND c.idol_id = ic.idol_id
                    AND c.card_type = 'idol'
                LEFT JOIN user_cards AS uc ON uc.user_id = %s AND uc.card_id = c.id
                WHERE cge.collection_id = %s
                    AND cge.is_eligible = TRUE
                    AND cge.has_bonus_cover = TRUE
                    AND cge.group_id IN (
                        SELECT group_id FROM idol_career WHERE idol_id = %s
                    )
                GROUP BY cge.group_id
                HAVING COUNT(DISTINCT c.id) = COUNT(DISTINCT uc.id)
            """, (user_id, collection_id, idol_id)
        )
        return [row["group_id"] for row in cursor.fetchall()]
    
    def _insert_group_photo_card(self, cursor, user_id: int, group_id: int, won_at: datetime, collection_id: int = 1) -> dict | None:
        """Inserts a new group photo card for a user."""
        cursor.execute(
            """
                SELECT id FROM cards
                WHERE collection_id = %s AND group_id = %s AND card_type = 'group_photo'
            """, (collection_id, group_id)
        )
        card_row = cursor.fetchone()
        if not card_row:
            return None
        
        return self._insert_new_card(cursor, user_id, card_row["id"], won_at)
    
    def _grant_completed_group_photos(self, cursor, user_id: int, idol_id: int, won_at: datetime, collection_id: int = 1) -> list[int]:
        """Checks and grants a group photo card to a user if they have all the idol cards in that group."""
        completed_group_ids = self._get_completed_group_ids(cursor, user_id, idol_id, collection_id)
        granted_group_ids = []
        for group_id in completed_group_ids:
            result = self._insert_group_photo_card(cursor, user_id, group_id, won_at, collection_id)
            if result:
                granted_group_ids.append(group_id)

        return granted_group_ids
    
    def get_collections(self, cursor, user_id: int | None) -> list[dict]:
        """Returns every collection with the user's distinct owned/total card counts.

        Feeds the /collections list page. Counting cards (not page slots) means a
        multi-page idol's single card counts once — no per-page inflation."""
        cursor.execute(
            """
                SELECT col.id AS collection_id, col.name, col.album_label, col.description,
                    COUNT(DISTINCT c.id) AS total_cards,
                    COUNT(DISTINCT uc.id) AS owned_cards
                FROM collections AS col
                LEFT JOIN cards AS c ON c.collection_id = col.id
                LEFT JOIN user_cards AS uc ON uc.user_id = %s AND uc.card_id = c.id
                GROUP BY col.id, col.name, col.album_label, col.description
                ORDER BY col.id
            """, (user_id,)
        )
        return cursor.fetchall()

    def collection_exists(self, cursor, collection_id: int) -> bool:
        cursor.execute("SELECT 1 FROM collections WHERE id = %s", (collection_id,))
        return cursor.fetchone() is not None

    def get_album(self, cursor, user_id: int | None, collection_id: int = 1) -> list[dict]:
        """Returns every eligible group page with full presentation data in one payload.

        Feeds the flip-book album UI, which renders all pages at once: group identity
        (name/hangul/debut/fandom), company + label from group_company_affiliation,
        group_features image/palette, the member roster with ownership, and the
        group_photo card. Eligible-but-cardless pages are omitted (same vanish
        behavior as get_overview/get_group_page)."""
        cursor.execute(
            """
                SELECT cge.group_id, g.name AS group_name, g.hangul_name,
                    g.group_debut_year AS debut_year, g.fandom_name,
                    gf.image_path, gf.image_version, gf.palette
                FROM collection_group_eligibility AS cge
                JOIN groups AS g ON g.id = cge.group_id
                LEFT JOIN group_features AS gf ON gf.group_id = cge.group_id
                WHERE cge.collection_id = %s AND cge.is_eligible = TRUE
                ORDER BY cge.group_id
            """, (collection_id,)
        )
        groups = cursor.fetchall()

        cursor.execute(
            """
                SELECT gca.group_id,
                    MAX(comp.name) FILTER (WHERE gca.role = 'Label') AS company,
                    MAX(comp.name) FILTER (WHERE gca.role = 'Parent Company') AS label
                FROM group_company_affiliation AS gca
                JOIN companies AS comp ON comp.id = gca.company_id
                JOIN collection_group_eligibility AS cge
                    ON cge.group_id = gca.group_id
                    AND cge.collection_id = %s AND cge.is_eligible = TRUE
                GROUP BY gca.group_id
            """, (collection_id,)
        )
        affiliations = {row["group_id"]: row for row in cursor.fetchall()}

        cursor.execute(
            """
                SELECT DISTINCT ON (ic.group_id, ic.idol_id)
                    ic.group_id, ic.idol_id, i.artist_name,
                    c.id AS card_id, COALESCE(c.image_path, i.image_path) AS image_path,
                    i.image_version,
                    uc.id IS NOT NULL AS owned,
                    uc.level, uc.first_won_at
                FROM idol_career AS ic
                JOIN collection_group_eligibility AS cge
                    ON cge.group_id = ic.group_id
                    AND cge.collection_id = %s AND cge.is_eligible = TRUE
                JOIN cards AS c ON c.collection_id = cge.collection_id
                    AND c.idol_id = ic.idol_id AND c.card_type = 'idol'
                JOIN idols AS i ON i.id = ic.idol_id
                LEFT JOIN user_cards AS uc ON uc.user_id = %s AND uc.card_id = c.id
                ORDER BY ic.group_id, ic.idol_id
            """, (collection_id, user_id)
        )
        members_by_group: dict[int, list[dict]] = {}
        for row in cursor.fetchall():
            member = dict(row)
            group_id = member.pop("group_id")
            members_by_group.setdefault(group_id, []).append(member)

        cursor.execute(
            """
                SELECT c.group_id, c.id AS card_id,
                    COALESCE(c.image_path, gf.image_path) AS image_path,
                    gf.image_version,
                    uc.id IS NOT NULL AS owned
                FROM cards AS c
                JOIN collection_group_eligibility AS cge
                    ON cge.group_id = c.group_id AND cge.collection_id = c.collection_id
                    AND cge.is_eligible = TRUE
                LEFT JOIN group_features AS gf ON gf.group_id = c.group_id
                LEFT JOIN user_cards AS uc ON uc.user_id = %s AND uc.card_id = c.id
                WHERE c.collection_id = %s AND c.card_type = 'group_photo'
            """, (user_id, collection_id)
        )
        photos_by_group: dict[int, dict] = {}
        for row in cursor.fetchall():
            photo = dict(row)
            photos_by_group[photo.pop("group_id")] = photo

        album = []
        for group in groups:
            group_id = group["group_id"]
            members = members_by_group.get(group_id)
            if not members:
                continue
            affiliation = affiliations.get(group_id) or {}
            company = affiliation.get("company")
            album.append({
                **group,
                "company": company,
                # No parent company row → the label company doubles as the label
                "label": affiliation.get("label") or company,
                "members": members,
                "group_photo": photos_by_group.get(group_id),
            })
        return album
