export const resolveCdnUrl = (path: string | null, version?: string | number | null): string |  null => {
    if (!path) return null;
    const imagePath = `${import.meta.env.VITE_IMAGE_BUCKET_URL}${path}`;
    return version ? `${imagePath}?v=${version}` : imagePath;
};
