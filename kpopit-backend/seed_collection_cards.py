# Seed Album 1 collection cards
from dotenv import load_dotenv
from services.get_db import get_manual_db

load_dotenv()

def seed_idol_cards(cursor, collection_id=1):
    """Creates collection cards for idols in the database."""
    cursor.execute(
        """
            INSERT INTO cards (collection_id, idol_id, card_type, created_at)
            SELECT DISTINCT %s, i.id, 'idol', NOW()
            FROM idol_career AS ic
            JOIN collection_group_eligibility AS cge 
                ON cge.group_id = ic.group_id AND cge.collection_id = %s
            JOIN idols AS i ON i.id = ic.idol_id
            WHERE cge.is_eligible = TRUE AND i.is_published = TRUE
            ON CONFLICT (collection_id, idol_id) WHERE card_type = 'idol' DO NOTHING
        """, (collection_id, collection_id)
    )
    print(f"Idol cards: {cursor.rowcount} inserted")

def seed_group_photo_cards(cursor, collection_id=1):
    """Creates group_photo card per eligible group that has a bonus cover"""
    cursor.execute(
        """
            INSERT INTO cards (collection_id, group_id, card_type, created_at)
            SELECT %s, cge.group_id, 'group_photo', NOW()
            FROM collection_group_eligibility AS cge
            WHERE cge.collection_id = %s 
                AND cge.is_eligible = TRUE
                AND cge.has_bonus_cover = TRUE
            ON CONFLICT (collection_id, group_id) WHERE card_type = 'group_photo' DO NOTHING
        """, (collection_id, collection_id)
    )
    print(f"Group photo cards: {cursor.rowcount} inserted")

def run_seed_cards():
    with get_manual_db() as connect:
        with connect.cursor() as cursor:
            try:
                seed_idol_cards(cursor)
                seed_group_photo_cards(cursor)

                connect.commit()
                print("Collection cards seeded successfully.")
            except Exception as e:
                connect.rollback()
                print(f"Error seeding collection cards: {e}")
                raise e
            
if __name__ == "__main__":
    try:
        run_seed_cards()
    finally:
        from services.get_db import pool
        pool.close()
