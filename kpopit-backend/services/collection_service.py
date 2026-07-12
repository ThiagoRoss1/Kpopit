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
    
    def get_overview(self, cursor, user_id: int, collection_id: int = 1) -> list[dict]:
        """Return an overview of the user's collection, per-group page."""
        cursor.execute(
            """
                SELECT cge.group_id, g.name AS group_name,
                    COUNT(DISTINCT c.id) AS total_idol_cards,
                    COUNT(DISTINCT uc.id) AS owned_idol_cards,
                    cge.has_bonus_cover,
                    BOOL_OR(buc.id IS NOT NULL) AS bonus_owned
                FROM collection_group_eligibility AS cge
                JOIN groups AS g ON g.id = cge.group_id
                JOIN idol_career AS ic ON ic.group_id = cge.group_id
                JOIN cards AS c ON c.collection_id = cge.collection_id
                    AND c.idol_id = ic.idol_id AND c.card_type = 'idol'
                LEFT JOIN user_cards AS uc ON uc.user_id = %s AND uc.card_id = c.id
                LEFT JOIN cards AS bc ON bc.collection_id = cge.collection_id
                    AND bc.group_id = cge.group_id AND bc.card_type = 'group_photo'
                LEFT JOIN user_cards AS buc ON buc.user_id = %s AND buc.card_id = bc.id
                WHERE cge.collection_id = %s AND cge.is_eligible = TRUE
                GROUP BY cge.group_id, g.name, cge.has_bonus_cover
                ORDER BY cge.group_id
            """, (user_id, user_id, collection_id)
        )
        return cursor.fetchall()
    
    def get_group_page(self, cursor, user_id: int, group_id: int, collection_id: int = 1) -> dict | None:
        """Returns the full roster for one group's page."""
        cursor.execute(
            """
                SELECT DISTINCT ON (ic.idol_id)
                    ic.idol_id, i.artist_name,
                    c.id AS card_id, COALESCE(c.image_path, i.image_path) AS image_path,
                    uc.id IS NOT NULL AS owned,
                    uc.level, uc.first_won_at
                FROM idol_career AS ic
                JOIN collection_group_eligibility AS cge
                    ON cge.group_id = ic.group_id AND cge.collection_id = %s
                JOIN cards AS c ON c.collection_id = cge.collection_id
                    AND c.idol_id = ic.idol_id AND c.card_type = 'idol'
                JOIN idols AS i ON i.id = ic.idol_id
                LEFT JOIN user_cards AS uc ON uc.user_id = %s AND uc.card_id = c.id
                WHERE ic.group_id = %s AND cge.is_eligible = TRUE
                ORDER BY ic.idol_id
            """, (collection_id, user_id, group_id)
        )
        members = cursor.fetchall()
        if not members:
            return None
        
        cursor.execute(
            """
                SELECT c.id AS card_id, c.image_path, uc.id IS NOT NULL AS owned
                FROM cards AS c
                LEFT JOIN user_cards AS uc ON uc.user_id = %s AND uc.card_id = c.id
                WHERE c.collection_id = %s AND c.group_id = %s AND c.card_type = 'group_photo'
            """, (user_id, collection_id, group_id)
        )
        group_photo = cursor.fetchone()

        return {"group_id": group_id, "members": members, "group_photo": group_photo}
