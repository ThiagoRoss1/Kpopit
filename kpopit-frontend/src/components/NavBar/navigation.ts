export interface DropLink {
    label: string;
    path: string;
    icon?: string;
    isWip?: boolean;
}

export const GAMES_LINKS: DropLink[] = [
    { 
        label: "Classic",
        path: "/",  // do not have classic yet so change after adding it 
        icon: "/public/kpopit-icon.png",
    },
    
    {
        label: "Blurry", 
        path: "/blurry", 
        icon: "/public/kpopit-icon.png"
    },
]

export const IDOLS_LINKS: DropLink[] = [
    {
        label: "All Idols - Soon",
        path: "/blurry",
        icon: "/public/kpopit-icon.png",
        isWip: true,
    }
]