import { Link } from "react-router-dom";

interface  GameMode {
    id: string;
    name: string;
    path: string;
    won?: boolean;
    photoSpecs?: string;
}

interface OtherGamemodesProps {
    otherGamemodes: GameMode[];
}

export const OtherGamemodes = (props: OtherGamemodesProps) => {
    const { otherGamemodes } = props;

    if (!otherGamemodes || otherGamemodes.length === 0) return null;

    return (
        <div className="flex w-full flex-col justify-center items-center">
            <div className="flex w-full gap-3 px-4 py-2 rounded-2xl border-2 border-dashed border-ink/50 bg-cream">
                {otherGamemodes.map((mode) => (
                    <Link key={mode.id} to={mode.path} className="flex flex-row justify-start items-center">
                        <div
                            className={`group flex items-center gap-2 h-15 max-w-55 px-4 rounded-2xl border-2 border-ink bg-white
                            shadow-[3px_3px_0_var(--color-ink)] hover:scale-105 hover:cursor-pointer
                            active:scale-95 ease-[cubic-bezier(0.34,1.56,0.64,1)] transition-all duration-500 transform-gpu
                            ${mode.won ? "opacity-50" : "opacity-100"}`}
                        >
                            <img
                                src="/kpopit-icon-svg.svg"
                                alt={mode.name}
                                draggable={false}
                                className={`${mode.photoSpecs ?? ""} w-9 h-9 sm:w-10 sm:h-10 object-contain`}
                            />

                            <span className="font-bold text-base sm:text-lg text-neon-ink leading-none truncate">
                                {mode.name}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};
