from PIL import Image
from pathlib import Path

SOURCE_FOLDER = '../../Kpopit-images/kpopit-idols-png'
DESTINATION_FOLDER = '../../Kpopit-images/kpopit-idols-webp'
WEBP_QUALITY = 90

def convert_images_to_webp(source_folder, destination_folder, webp_quality):
    source_folder_path = Path(source_folder)
    destination_folder_path = Path(destination_folder)

    destination_folder_path.mkdir(parents=True, exist_ok=True)

    print("-- Starting -- ")
    print(f"Source folder: {source_folder}")
    print(f"Destination folder: {destination_folder}")

    if not source_folder_path.exists():
        print(f"Source folder does not exist: {source_folder}")
        return
    
    count = 0
    errors = 0
    skipped = 0

    files = list(source_folder_path.glob("*.png"))
    total_files = len(files)

    if total_files == 0:
        print("No PNG files found in the source folder.")
        return

    for image_file in files:
        webp_image_path = destination_folder_path / f"{image_file.stem}.webp"

        if webp_image_path.exists():
            print(f"File already exists, skipping: {webp_image_path.name}")
            skipped += 1
            continue

        try:
            with Image.open(image_file) as img:
                if img.mode in ('P', 'L'):
                    img = img.convert("RGBA")

                img.save(webp_image_path, "WEBP", quality=webp_quality, optimize=True)

                print(f"Converted: {image_file.name} -> {webp_image_path.name}")
                count += 1

        except Exception as e:
            print(f"Error converting {image_file.name}: {e}")
            errors += 1

    print("\n-- Summary --")
    print(f"Total files processed: {total_files}")
    print(f"Successfully converted: {count}")
    print(f"Skipped (already exists): {skipped}")
    print(f"Errors encountered: {errors}")

if __name__ == "__main__":
    convert_images_to_webp(SOURCE_FOLDER, DESTINATION_FOLDER, WEBP_QUALITY)
