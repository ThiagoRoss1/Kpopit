import React, { useMemo } from "react";
import { motion } from "motion/react";
import Star from "../../assets/icons/star-four-fill.svg";
import Img from "../Img";

interface BackgroundStyleProps {
    attempts?: number;
}

const BackgroundStyle = (props: BackgroundStyleProps) => {
    const { attempts } = props;


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
      case 'extreme-large': return 'max-xxs:size-14 xxs:size-16 sm:size-30 md:size-40';
      case 'super-large': return 'max-xxs:size-10 xxs:size-12 sm:size-14 md:size-22';
      case 'extra-large': return 'max-xxs:size-8 xxs:size-10 sm:size-10 md:size-16';
      case 'large': return 'max-xxs:size-5 xxs:size-6 sm:size-6 md:size-10';
      case 'medium': return 'max-xxs:size-4 xxs:size-5 sm:size-4 md:size-6';
      case 'sparkle': return 'max-xxs:size-2 xxs:size-3 sm:size-3 md:size-5';
      case 'particle': return 'max-xxs:size-1 xxs:size-1 sm:size-1.5 md:size-4';
      default: return 'size-4 sm:size-6';
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
        <div className="absolute inset-0 bg-black/0" />
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
        {/* Desktop-only stars are hidden by a breakpoint, so the prerendered page matches the phone. */}
        {stars.map((star) => (
            <div 
              key={star.id}
              className={`absolute ${star.showOnMobile === false ? "max-[768px]:hidden" : ""}`}
              style={{
                top: star.top,
                bottom: star.bottom,
                left: star.left,
                right: star.right,
                transform: `rotate(${star.rotation}deg)`,
              }}
            >
            <Img
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
