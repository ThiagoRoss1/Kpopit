import { cn } from "../../lib/utils";
import { resolveCdnUrl } from "../../utils/imageUrl";
import PixelatedCanvas from "../Pixelated/PixelatedCanvas";

interface ModeImageProps {
    src: string | null;
    /** Draws the photo as the Pixelated mosaic at this block size (a CSS pixelated look can't
     *  show on a photo that is scaled down). */
    pixelBlock?: number;
    className?: string;
}

/** A mode's photo in a tile: the plain image, or Pixelated's own mosaic for the Pixelated mode. */
const ModeImage = ({ src, pixelBlock, className }: ModeImageProps) => {
    const url = resolveCdnUrl(src) ?? undefined;

    if (pixelBlock) return <PixelatedCanvas imageUrl={url} blockSize={pixelBlock} className={cn("block size-full", className)} />;

    return <img src={url} alt="" loading="lazy" draggable={false} className={cn("block size-full object-cover", className)} />;
};

export default ModeImage;
