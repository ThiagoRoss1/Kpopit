interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

const MAX_OUTPUT_SIZE = 512;

export const getCroppedImg = async (imageSrc: string, crop: CropArea): Promise<Blob> => {
    const image = await loadImage(imageSrc);

    const scale = Math.min(1, MAX_OUTPUT_SIZE / Math.max(crop.width, crop.height));
    const outWidth = Math.round(crop.width * scale);
    const outHeight = Math.round(crop.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = outWidth;
    canvas.height = outHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        outWidth,
        outHeight,
    );

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Failed to create cropped image blob"))),
            "image/png",
        );
    });
};
