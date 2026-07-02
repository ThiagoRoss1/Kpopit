from PIL import Image
from pathlib import Path
import io

SOURCE_FOLDER = '../../../Kpopit-images/kpopit-albums-raw'
DESTINATION_FOLDER = '../../../Kpopit-images/kpopit-albums-webp'
WEBP_QUALITY = 85
WEBP_QUALITY_AVATARS = 80
SUPPORTED_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.gif')

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

    files = sorted(
        f for f in source_folder_path.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
    )
    total_files = len(files)

    if total_files == 0:
        print(f"No supported image files found in the source folder. "
              f"Supported: {', '.join(SUPPORTED_EXTENSIONS)}")
        return

    for image_file in files:
        webp_image_path = destination_folder_path / f"{image_file.stem}.webp"

        if webp_image_path.exists():
            print(f"File already exists, skipping: {webp_image_path.name}")
            skipped += 1
            continue

        try:
            with Image.open(image_file) as img:
                if img.mode in ('P', 'L', 'LA'):
                    img = img.convert("RGBA")
                elif img.mode == 'CMYK':
                    img = img.convert("RGB")

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

def convert_to_webp_bytes(file_bytes: bytes, quality: int = WEBP_QUALITY_AVATARS, max_size: int = 500) -> bytes:
    """Convert image bytes to WebP format and return the new bytes."""
    img = Image.open(io.BytesIO(file_bytes))

    if img.mode in ('P', 'L', 'LA'):
        img = img.convert("RGBA")
    elif img.mode == 'CMYK':
        img = img.convert("RGB")

    if img.width > max_size or img.height > max_size:
        img.thumbnail((max_size, max_size), Image.LANCZOS)

    output = io.BytesIO()
    img.save(output, format="WEBP", quality=quality, optimize=True)
    output.seek(0)
    return output.getvalue()
