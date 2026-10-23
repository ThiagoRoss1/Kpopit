// Plain-text page content shared by the About / How to play pages (Phase 6b) and the existing modals.
// Rendering (styles, links, images) stays in the components.

export interface ContentSection {
    heading: string;
    paragraphs: string[];
    /** Optional bullet list shown after the paragraphs. */
    items?: string[];
}

export interface ContentPage {
    title: string;
    intro: string;
    sections: ContentSection[];
}
