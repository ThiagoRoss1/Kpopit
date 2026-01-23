export interface DropLink {
    label: string;
    path: string;
    icon?: string;
}

export const GAMES_LINKS: DropLink[] = [
    { 
        label: "Blurry", 
        path: "/blurry", 
        icon: "📸" 
    }
]