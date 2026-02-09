export interface DropLink {
    label: string;
    path: string;
    icon?: string;
    isWip?: boolean;
}

export const GAMES_LINKS: DropLink[] = [
    { 
        label: "Classic",
        path: "/classic",
        icon: "/kpopit-icon-svg.svg",
    },
    
    {
        label: "Blurry", 
        path: "/blurry", 
        icon: "/kpopit-icon-svg.svg"
    },
]

export const IDOLS_LINKS: DropLink[] = [
    {
        label: "All Idols - Soon",
        path: "/idols",
        icon: "/kpopit-icon-svg.svg",
        isWip: true,
    }
]