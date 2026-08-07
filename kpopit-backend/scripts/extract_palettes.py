import json
import os
from dotenv import load_dotenv
from services.get_db import get_manual_db, pool
from utils.palette_extractor import extract_palette

load_dotenv()

R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL")

def run():
    # Palette extraction for albums missing palette data
    if not R2_PUBLIC_URL:
        print("R2_PUBLIC_URL not set — skipping palette extraction.")
        return

    with get_manual_db() as connect:
        with connect.cursor() as cursor:
            cursor.execute(
                "SELECT id, cover_path FROM albums "
                "WHERE palette IS NULL OR palette::text = 'null' OR palette::text = '[]'"
            )
            rows = cursor.fetchall()
            print(f"Extracting palette for {len(rows)} album(s)...")

            for row in rows:
                image_url = f"{R2_PUBLIC_URL.rstrip('/')}/{row['cover_path'].lstrip('/')}"
                palette = extract_palette(image_url)
                if not palette:
                    continue
                cursor.execute(
                    "UPDATE albums SET palette = %s::json WHERE id = %s",
                    (json.dumps(palette), row["id"]),
                )

            connect.commit()
            print("Palette extraction completed.")


if __name__ == "__main__":
    try:
        run()
    except Exception as exc:
        print(f"Error during palette extraction: {exc}")
    finally:
        pool.close()
