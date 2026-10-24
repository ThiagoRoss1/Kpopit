import { Helmet } from "react-helmet-async";

export const SITE_URL = "https://kpopit.net";
const DEFAULT_IMAGE = `${SITE_URL}/kpopit-icon.png`;

type JsonLd = Record<string, unknown>;

type PageMetaProps = {
    title: string;
    description: string;
    /** Path of the canonical URL, starting with "/". */
    path: string;
    /** Absolute image URL for link previews (the site icon by default). */
    image?: string;
    /** Shorter title/description for link previews (the page's own by default). */
    social?: { title: string; description: string };
    /** Structured data (schema.org) for this page only: one object, or several (one script each). */
    jsonLd?: JsonLd | JsonLd[];
};

// JSON inside <script> must not be able to close the tag.
const serializeJsonLd = (data: JsonLd) => JSON.stringify(data).replace(/</g, "\\u003c");

/** Each page's head: one title and description, canonical URL, Open Graph and Twitter tags. */
export default function PageMeta({ title, description, path, image = DEFAULT_IMAGE, social, jsonLd }: PageMetaProps) {
    const url = `${SITE_URL}${path}`;
    const preview = social ?? { title, description };
    return (
        <Helmet>
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />
            <meta property="og:title" content={preview.title} />
            <meta property="og:description" content={preview.description} />
            <meta property="og:url" content={url} />
            <meta property="og:site_name" content="KpopIt" />
            <meta property="og:image" content={image} />
            <meta name="twitter:title" content={preview.title} />
            <meta name="twitter:description" content={preview.description} />
            <meta name="twitter:image" content={image} />
            {(Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []).map((data, i) => (
                <script key={i} type="application/ld+json">{serializeJsonLd(data)}</script>
            ))}
        </Helmet>
    );
}
