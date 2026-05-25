from io import BytesIO
import numpy as np
import requests
from PIL import Image
from sklearn.cluster import KMeans

def extract_palette(image_url: str, k: int = 4) -> list[str]:
    """Return up to k dominant hex colors of an image, sorted brightest-first.

    Returns [] on any network/decode/clustering failure so the seed can keep
    going on a flaky cover URL.
    """
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content)).convert("RGB")
        image = image.resize((100, 100))

        pixels = np.array(image).reshape(-1, 3).astype(float)

        kmeans = KMeans(n_clusters=k, n_init=4, random_state=42).fit(pixels)
        centers = kmeans.cluster_centers_

        def brightness(rgb):
            r, g, b = rgb
            return 0.299 * r + 0.587 * g + 0.114 * b

        ordered = sorted(centers, key=brightness, reverse=True)
        return [
            "#{:02x}{:02x}{:02x}".format(int(r), int(g), int(b))
            for r, g, b in ordered
        ]
    except Exception as exc:
        print(f"[palette_extractor] failed for {image_url}: {exc}")
        return []
