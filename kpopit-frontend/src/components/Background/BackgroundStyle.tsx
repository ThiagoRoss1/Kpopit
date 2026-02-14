import React, { useMemo } from "react";
import { motion } from "framer-motion";
import Star from "../../assets/icons/star-four-fill.svg";
import { useIsMobile } from "../../hooks/useIsDevice";

interface BackgroundStyleProps {
    attempts?: number;
}

const BackgroundStyle = (props: BackgroundStyleProps) => {
    const { attempts } = props;

    const isMobile = useIsMobile();

    const stars = useMemo(() => [

        // Left Side Stars
        { id: 1, top: '8%', left: '18%', size: 'super-large', rotation: 12, showOnMobile: true },
        { id: 2, top: '14%', left: '11%', size: 'extra-large', rotation: -12, showOnMobile: true },
        { id: 3, top: '-8%', left: '1%', size: 'extreme-large', rotation: -10, showOnMobile: true },
        { id: 4, top: '24%', left: '4%', size: 'sparkle', rotation: -40, showOnMobile: true },
        { id: 5, top: '30%', left: '17%', size: 'extra-large', rotation: 20, showOnMobile: false },
        { id: 6, top: '25%', left: '4%', size: 'super-large', rotation: 10, showOnMobile: true },
        { id: 7, top: '4%', left: '15%', size: 'particle', rotation: 10, showOnMobile: true },
        { id: 8, top: '40%', left: '-4%', size: 'extreme-large', rotation: 10, showOnMobile: true },
        { id: 9, top: '34%', left: '16%', size: 'sparkle', rotation: -20, showOnMobile: false },
        { id: 10, bottom: '35%', left: '12%', size: 'extreme-large', rotation: -25, showOnMobile: false },
        { id: 11, bottom: '35%', left: '4%', size: 'medium', rotation: -10, showOnMobile: false },
        { id: 12, bottom: '14%', left: '12%', size: 'large', rotation: 22, showOnMobile: true },
        { id: 13, bottom: '-8%', left: '-2%', size: 'extreme-large', rotation: -15, showOnMobile: true },
        { id: 14, bottom: '5%', left: '4%', size: 'large', rotation: 10, showOnMobile: false },
        { id: 15, bottom: '13%', left: '17%', size: 'particle', rotation: 0, showOnMobile: true },
        { id: 16, bottom: '6%', left: '17%', size: 'super-large', rotation: 0, showOnMobile: true },

        // Right Side Stars
        { id: 17, top: '8%', right: '18%', size: 'super-large', rotation: -12, showOnMobile: true },
        { id: 18, top: '14%', right: '11%', size: 'extra-large', rotation: 12, showOnMobile: true },
        { id: 19, top: '-8%', right: '1%', size: 'extreme-large', rotation: 10, showOnMobile: true },
        { id: 20, top: '24%', right: '4%', size: 'sparkle', rotation: 40, showOnMobile: true },
        { id: 21, top: '30%', right: '17%', size: 'extra-large', rotation: -20, showOnMobile: false },
        { id: 22, top: '25%', right: '4%', size: 'super-large', rotation: -10, showOnMobile: true },
        { id: 23, top: '4%', right: '15%', size: 'particle', rotation: -10, showOnMobile: true },
        { id: 24, top: '40%', right: '-4%', size: 'extreme-large', rotation: -10, showOnMobile: true },
        { id: 25, top: '34%', right: '16%', size: 'sparkle', rotation: 20, showOnMobile: false },
        { id: 26, bottom: '35%', right: '12%', size: 'extreme-large', rotation: 25, showOnMobile: false },
        { id: 27, bottom: '35%', right: '4%', size: 'medium', rotation: 10, showOnMobile: false },
        { id: 28, bottom: '14%', right: '12%', size: 'large', rotation: -22, showOnMobile: true },
        { id: 29, bottom: '-8%', right: '-2%', size: 'extreme-large', rotation: 15, showOnMobile: true },
        { id: 30, bottom: '5%', right: '4%', size: 'large', rotation: -10, showOnMobile: false },
        { id: 31, bottom: '13%', right: '17%', size: 'particle', rotation: 0, showOnMobile: true },
        { id: 32, bottom: '6%', right: '17%', size: 'super-large', rotation: 0, showOnMobile: true },
    ], []);

  const getSizeClass = (size: string) => {
    switch(size) {
      case 'extreme-large': return 'max-xxs:w-14 max-xxs:h-14 xxs:w-16 xxs:h-16 sm:w-30 sm:h-30 md:w-40 md:h-40';
      case 'super-large': return 'max-xxs:w-10 max-xxs:h-10 xxs:w-12 xxs:h-12 sm:w-14 sm:h-14 md:w-22 md:h-22';
      case 'extra-large': return 'max-xxs:w-8 max-xxs:h-8 xxs:w-10 xxs:h-10 sm:w-10 sm:h-10 md:w-16 md:h-16';
      case 'large': return 'max-xxs:w-5 max-xxs:h-5 xxs:w-6 xxs:h-6 sm:w-6 sm:h-6 md:w-10 md:h-10';
      case 'medium': return 'max-xxs:w-4 max-xxs:h-4 xxs:w-5 xxs:h-5 sm:w-4 sm:h-4 md:w-6 md:h-6';
      case 'sparkle': return 'max-xxs:w-2 max-xxs:h-2 xxs:w-3 xxs:h-3 sm:w-3 sm:h-3 md:w-5 md:h-5';
      case 'particle': return 'max-xxs:w-1 max-xxs:h-1 xxs:w-1 xxs:h-1 sm:w-1.5 sm:h-1.5 md:w-4 md:h-4';
      default: return 'w-4 h-4 sm:w-6 sm:h-6';
    }
  };

  const starsDelay = (size: string) => {
    switch(size) {
      case 'extreme-large':
        return 0;
      case 'super-large':
        return 1.8;
      case 'extra-large':
        return 1.2;
      case 'large':
        return 1;
      case 'medium':
        return 0.6;
      case 'sparkle':
        return 0.3;
      case 'particle':
        return 0.1;
      default:
        return 0;
    }
  };


  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none -z-10" 
      style={{ 
        height: '100%',
        minHeight: '100vh',
        maxHeight: '100lvh',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
      }}
    >
      <div className="absolute inset-0 bg-linear-to-br from-[#090311] via-[#050416] to-[#050822]" />
        <div className="absolute inset-0 top-0 bg-black/0" />
        {attempts ? attempts < 1 && (
        <motion.div 
            animate={ attempts === 0 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 3 }}
            className="absolute inset-0 bg-[#85365f]/0
            blur-[80px] rounded-full w-110 h-70 top-70 left-185 animate-pulse" // Adjust after 
            style={{
                filter: 'blur(80px)',
                boxShadow: '0 0 200px rgba(236, 72, 156, 0)', // Adjust after
                animationDuration: '4s'
            }} 
        />
        ) : null}
      
      <div className="absolute inset-0">
        {stars
            .filter(star => !isMobile || star.showOnMobile !== false)
            .map((star) => (
            <div 
              key={star.id}
              className="absolute"
              style={{
                top: star.top,
                bottom: star.bottom,
                left: star.left,
                right: star.right,
                transform: `rotate(${star.rotation}deg)`,
              }}
            >
            {/* Debugging IDs */}
            {/* <span key={star.id} className="absolute text-white text-xs">{star.id}</span> */}
            <img
              src={Star}
              alt="Star"
              className={`${getSizeClass(star.size)} star-twinkle origin-center`}
              style={{
                animationDelay: `${starsDelay(star.size) + (star.id % 5) * 0.3 }s`,
                filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.4)) drop-shadow(0 0 10px rgba(255, 255, 255, 0.4))'
              }}
            />
            </div>
        ))}
      </div>
      
      <div className="absolute inset-0 bg-linear-to-t from-white/20 via-transparent to-white/5" />
      <div className="absolute inset-0 bg-linear-to-b from-white/20 via-transparent to-white/5" />
      <div className="absolute inset-0 bg-linear-to-r from-white/5 via-transparent to-gray-900/0" />
      <div className="absolute inset-0 bg-linear-to-l from-white/5 via-transparent to-gray-900/0" />
    </div>
  );
};

export default React.memo(BackgroundStyle);
