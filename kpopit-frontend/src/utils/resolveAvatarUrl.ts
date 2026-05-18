const kpopitIdols = import.meta.env.VITE_IMAGE_BUCKET_URL;
const avatarsBucket = import.meta.env.VITE_AVATARS_BUCKET_URL;

const stripTrailingSlash = (s: string) => (s.endsWith("/") ? s.slice(0, -1) : s);
const stripLeadingSlash = (s: string) => (s.startsWith("/") ? s.slice(1) : s);

/* Resolves an avatar/image path to a full CDN URL. */

export function resolveAvatarUrl(
    avatar_url: string | null | undefined,
    version?: string | number | null,
): string | null {
    if (!avatar_url) return null;

    const path = stripLeadingSlash(avatar_url);
    const isUserAvatar = path.startsWith("avatars/");
    const base = isUserAvatar ? avatarsBucket : kpopitIdols;
    const url = `${stripTrailingSlash(base)}/${path}`;

    if (isUserAvatar && version) {
        return `${url}?v=${encodeURIComponent(String(version))}`;
    }
    return url;
}
