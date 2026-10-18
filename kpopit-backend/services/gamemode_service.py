class GameModeService:
    """Facts about the game modes themselves."""

    def __init__(self, db):
        self.db = db

    def count_gamemodes(self, cursor) -> int:
        cursor.execute("SELECT COUNT(*) AS gamemodes_count FROM gamemodes")
        result = cursor.fetchone()
        return result["gamemodes_count"] if result and result["gamemodes_count"] is not None else 0
