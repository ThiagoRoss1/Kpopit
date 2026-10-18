class IdolConflict(Exception):
    """An idol with this id or artist name already exists (the route answers 409)."""

    def __init__(self, message: str, idol_id: int | None = None):
        super().__init__(message)
        self.message = message
        self.idol_id = idol_id


class AdminService:
    """Admin-only catalog edits."""

    def __init__(self, db):
        self.db = db

    def add_idol(self, cursor, data: dict) -> int:
        """Insert one idol (explicit id optional) and return its id; raises IdolConflict on a duplicate."""
        nationality = ", ".join(data.get("nationality", [])) if isinstance(data.get("nationality"), list) else data.get("nationality", "")
        position = ", ".join(data.get("position", [])) if isinstance(data.get("position"), list) else data.get("position", "")
        is_published = bool(data.get("is_published", False))
        idol_id = data.get("id")

        try:
            if idol_id:
                cursor.execute("SELECT id FROM idols WHERE id = %s", (idol_id,))
                if cursor.fetchone():
                    raise IdolConflict(f"Idol with ID {idol_id} already exists")

            cursor.execute("SELECT id FROM idols WHERE artist_name = %s", (data["artist_name"],))
            existing_name = cursor.fetchone()
            if existing_name:
                raise IdolConflict("Idol with this artist name already exists", existing_name["id"])

            values = (
                data["artist_name"],
                data.get("real_name"),
                data.get("gender"),
                data.get("debut_year"),
                nationality,
                data.get("birth_date"),
                data.get("height"),
                position,
                data.get("image_path"),
                is_published
            )
            if idol_id:
                cursor.execute("""
                    INSERT INTO idols (
                    id, artist_name, real_name, gender, debut_year, nationality, birth_date, height, position, image_path, is_published)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (idol_id, *values))
                final_idol_id = idol_id
            else:
                cursor.execute("""
                    INSERT INTO idols (
                    artist_name, real_name, gender, debut_year, nationality, birth_date, height, position, image_path, is_published)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, values)
                final_idol_id = cursor.fetchone()["id"]

            self.db.commit()
            return final_idol_id
        except Exception:
            self.db.rollback()
            raise
