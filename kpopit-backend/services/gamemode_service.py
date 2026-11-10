import services.inkit_mode as inkit_mode


class GameModeService:
    """Facts about the game modes themselves."""

    def __init__(self, db):
        self.db = db

    def count_gamemodes(self, cursor) -> int:
        # InkIt's row exists from its migration on; it counts only while the mode is on.
        hidden = [] if inkit_mode.INKIT_ENABLED else [inkit_mode.INKIT_GAMEMODE_ID]
        cursor.execute("SELECT COUNT(*) AS gamemodes_count FROM gamemodes WHERE NOT (id = ANY(%s))", (hidden,))
        result = cursor.fetchone()
        return result["gamemodes_count"] if result and result["gamemodes_count"] is not None else 0
