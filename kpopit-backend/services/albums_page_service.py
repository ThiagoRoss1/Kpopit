_ARTIST_JOIN = """
    LEFT JOIN groups g ON g.id = a.group_id
    LEFT JOIN idols i ON i.id = a.soloist_id
"""


class AlbumsPageService:
    """The /albums catalogue and album pages: published albums only, like the idols page."""

    def __init__(self, db):
        self.db = db

    def get_albums_page(self, cursor) -> list[dict]:
        """Every published album with its artist, for /albums (release year only over the wire)."""
        cursor.execute(f"""
            SELECT a.id, a.name, a.type, a.language, a.cover_path,
                EXTRACT(YEAR FROM a.release_date)::int AS release_year,
                a.group_id, a.soloist_id,
                COALESCE(i.artist_name, g.name) AS artist_name
            FROM albums a
            {_ARTIST_JOIN}
            WHERE a.is_published = TRUE
            ORDER BY a.release_date DESC, a.id DESC
        """)
        return cursor.fetchall()

    def get_album(self, cursor, album_id: int) -> dict | None:
        """One published album with its release date, artist facts and the artist's other albums."""
        cursor.execute(f"""
            SELECT a.id, a.name, a.type, a.language, a.cover_path, a.palette,
                a.release_date, a.group_id, a.soloist_id,
                COALESCE(i.artist_name, g.name) AS artist_name,
                g.hangul_name, g.generation, g.member_count, g.fandom_name, g.group_debut_year,
                i.debut_year AS soloist_debut_year
            FROM albums a
            {_ARTIST_JOIN}
            WHERE a.id = %s AND a.is_published = TRUE
        """, (album_id,))
        album = cursor.fetchone()
        if not album:
            return None

        # Same artist: the soloist for a solo album (every solo album sits in the shared "Soloists"
        # group), else the group, solo albums of its members left out.
        solo = album["soloist_id"] is not None
        artist_filter = "a.soloist_id = %s" if solo else "a.group_id = %s AND a.soloist_id IS NULL"
        cursor.execute(f"""
            SELECT a.id, a.name, a.type, a.language, a.cover_path,
                EXTRACT(YEAR FROM a.release_date)::int AS release_year
            FROM albums a
            WHERE a.is_published = TRUE AND a.id <> %s AND {artist_filter}
            ORDER BY a.release_date, a.id
        """, (album_id, album["soloist_id"] if solo else album["group_id"]))
        discography = cursor.fetchall()
        # The shared "Soloists" group's facts don't describe a soloist.
        group_fact = (lambda key: None) if solo else album.get

        return {
            "id": album["id"],
            "name": album["name"],
            "type": album["type"],
            "language": album["language"],
            "cover_path": album["cover_path"],
            "palette": album["palette"],
            "release_date": album["release_date"].isoformat(),
            "artist": {
                "name": album["artist_name"],
                "group_id": album["group_id"],
                "soloist_id": album["soloist_id"],
                "is_soloist": solo,
                "hangul_name": group_fact("hangul_name"),
                "debut_year": album["soloist_debut_year"] if solo else album["group_debut_year"],
                "generation": group_fact("generation"),
                "member_count": group_fact("member_count"),
                "fandom_name": group_fact("fandom_name"),
            },
            "discography": discography,
        }
