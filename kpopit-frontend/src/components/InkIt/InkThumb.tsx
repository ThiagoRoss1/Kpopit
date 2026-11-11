import { cn } from "../../lib/utils";
import { resolveCdnUrl } from "../../utils/imageUrl";
import { GAME_ROWS } from "../NavBar/navigation";

const INKIT_PHOTO = GAME_ROWS.find((row) => row.id === "inkit")?.img ?? null;

/** InkIt's stand-in logo: a photo under the paper texture (until the real asset exists). */
const InkThumb = ({ className }: { className?: string }) => {
    return (
        <span className={cn("relative block flex-none overflow-hidden border-2 border-(--ink)", className)}>
            <img
                src={resolveCdnUrl(INKIT_PHOTO) ?? undefined}
                alt=""
                draggable={false}
                className="block size-full object-cover object-center contrast-[1.3] grayscale"
            />
            <span aria-hidden className="inkit-paper-thumb pointer-events-none absolute inset-0" />
        </span>
    );
};

export default InkThumb;
