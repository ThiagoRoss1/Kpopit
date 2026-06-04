export const albumCoverUrl = (coverPath: string): string =>
    `${import.meta.env.VITE_IMAGE_BUCKET_URL}${coverPath}`;
