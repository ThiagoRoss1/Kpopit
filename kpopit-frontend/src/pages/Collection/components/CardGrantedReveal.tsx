import { Link } from 'react-router-dom';
import type { CardGranted } from '../../../interfaces/albumInterfaces';
import { BookImage, ArrowRight } from 'lucide-react';

interface CardGrantedRevealProps {
    cardGranted: CardGranted;
}

const LEVEL_FRAME: Record<number, string> = {
    1: 'border-white/60 shadow-[3px_3px_0px_rgba(255,255,255,0.6)]',
    2: 'border-[#BF953F] shadow-[3px_3px_0px_#BF953F]',
    3: 'border-[#FF5BA8] shadow-[3px_3px_0px_#FF5BA8]',
};

const LEVEL_ICON: Record<number, string> = {
    1: 'text-white/60',
    2: 'text-[#BF953F]',
    3: 'text-[#FF5BA8]',
};

export default function CardGrantedReveal(props: CardGrantedRevealProps) {
    const { cardGranted } = props;

    if (import.meta.env.VITE_COLLECTION_ENABLED !== 'true' || !cardGranted) return null;
    if (cardGranted.times_won > 3) return null;

    const frame = LEVEL_FRAME[cardGranted.level] ?? LEVEL_FRAME[1];
    const iconColor = LEVEL_ICON[cardGranted.level] ?? LEVEL_ICON[1];
    const headline = cardGranted.is_new
        ? 'New card collected!'
        : cardGranted.level === 3
            ? `Card maxed out! - LV.${cardGranted.level}`
            : `Card leveled up! — LV.${cardGranted.level}`;

    return (
        <div className="mt-8 flex w-full items-center justify-center px-3">
            <div className={`flex flex-col items-center gap-1 rounded-xl border-[3px] bg-ink/60 px-6 py-4 text-center ${frame}`}>
                <div className="flex flex-row gap-2 justify-center items-center text-lg font-bold text-white">
                    <span>{headline}</span>
                    <BookImage className={`w-4.5 h-4.5 rotate-4 ${iconColor}`} />
                </div>
                
                {cardGranted.group_photo.length > 0 && (
                    <p className="text-[14px] font-bold text-[#FFD86B]">
                        Group photo unlocked!
                    </p>
                )}

                <Link
                    to="/collections"
                    className="flex flex-row mt-1 justify-center items-center gap-1 text-[14px] font-bold
                    text-neon-pink underline transition-all duration-300 hover:brightness-125"
                >
                    View your collections <ArrowRight className="inline-block w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
}
