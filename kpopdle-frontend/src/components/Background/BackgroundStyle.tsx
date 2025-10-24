import { useMemo } from "react";
import { motion } from "framer-motion";
import Star from "../../assets/icons/star-four-fill.svg";

interface BackgroundStyleProps {
    attempts: number;
}

const BackgroundStyle = (props: BackgroundStyleProps) => {
    const { attempts } = props;
    const stars = useMemo(() => [

        // Large stars (w-8 h-8 = 32px)
        { id: 1, top: '8%', left: '10%', size: 'extra-large', rotation: 12, delay: 0 },
        { id: 2, top: '18%', left: '16%', size: 'medium', rotation: 16, delay: 1 },
        { id: 3, top: '6%', left: '4%', size: 'small', rotation: 20, delay: 0 },
        { id: 4, top: '20%', right: '20%', size: 'medium', rotation: 45, delay: 1 },
        { id: 5, bottom: '25%', left: '10%', size: 'large', rotation: -12, delay: 2 },
        { id: 6, bottom: '15%', right: '15%', size: 'medium', rotation: 90, delay: 0.5 },
        { id: 7, top: '35%', left: '5%', size: 'large', rotation: 180, delay: 1.5 },
        { id: 8, top: '45%', right: '8%', size: 'large', rotation: -45, delay: 2.5 },
        
        // Medium stars (w-5 h-5 = 20px)
        { id: 9, top: '60%', left: '25%', size: 'medium', rotation: 30, delay: 0.3 },
        { id: 10, top: '15%', left: '60%', size: 'small', rotation: -60, delay: 1.3 },
        { id: 11, bottom: '40%', right: '40%', size: 'medium', rotation: 75, delay: 2.3 },
        { id: 12, top: '75%', right: '25%', size: 'medium', rotation: -30, delay: 0.8 },
        
        // Small stars (w-3 h-3 = 12px)
        { id: 13, top: '30%', left: '80%', size: 'small', rotation: 15, delay: 1.8 },
        { id: 14, bottom: '60%', left: '70%', size: 'small', rotation: -15, delay: 2.8 },
        { id: 15, top: '80%', left: '40%', size: 'small', rotation: 60, delay: 0.2 },
        { id: 16, top: '5%', right: '45%', size: 'small', rotation: -90, delay: 1.2 },
        { id: 17, bottom: '5%', left: '35%', size: 'small', rotation: 135, delay: 2.2 },
        
        // Extra sparkles
        { id: 18, top: '25%', left: '90%', size: 'sparkle', rotation: 45, delay: 0.7 },
        { id: 19, bottom: '80%', right: '5%', size: 'sparkle', rotation: -45, delay: 1.7 },
        { id: 20, top: '50%', left: '3%', size: 'sparkle', rotation: 90, delay: 2.7 },
        { id: 21, bottom: '30%', right: '60%', size: 'sparkle', rotation: -135, delay: 0.4 },
        { id: 22, top: '65%', right: '10%', size: 'sparkle', rotation: 180, delay: 1.4 }
    ], []);

  const getSizeClass = (size: string) => {
    switch(size) {
        case 'extra-large': return 'sm:w-20 sm:h-20';
        case 'large': return 'sm:w-10 sm:h-10';
        case 'medium': return 'sm:w-6 sm:h-6';
        case 'small': return 'sm:w-4 sm:h-4';
        case 'sparkle': return 'sm:w-5 sm:h-5';
        case 'particle': return 'sm:w-3 sm:h-3';
        default: return 'sm:w-6 sm:h-6';
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-[#fbbf24] via-[#cf337c] to-[#fbbf24]" />
        <div className="absolute inset-0 top-0 bg-black/0" />
        {attempts < 1 && (
        <motion.div 
            animate={ attempts === 0 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 3 }}
            className="absolute inset-0 bg-[#85365f]/60
            blur-[80px] rounded-full w-110 h-70 top-70 left-185 animate-pulse"
            style={{
                filter: 'blur(80px)',
                boxShadow: '0 0 200px rgba(236, 72, 156, 0.3)',
                animationDuration: '4s'
            }} 
        />
        )}
      
      {/* <div 
        className="absolute top-1/4 left-145 sm:w-96 sm:h-96 bg-white/10 rounded-full animate-pulse"
        style={{
          filter: 'blur(80px)',
          boxShadow: '0 0 200px rgba(236, 72, 153, 0.3)',
          animationDuration: '4s'
        }}
      />
      <div 
        className="absolute bottom-1/3 right-145 sm:w-96 sm:h-96 bg-white/10 rounded-full animate-pulse"
        style={{
          filter: 'blur(80px)',
          boxShadow: '0 0 200px rgba(236, 72, 153, 0.3)',
          animationDuration: '4s',
        }}
      />
      <div 
        className="absolute top-2/3 left-1/3 w-64 h-64 bg-pink-400/10 rounded-full animate-pulse"
        style={{
          filter: 'blur(80px)',
          boxShadow: '0 0 160px rgba(236, 72, 153, 0.2)',
          animationDuration: '6s',
          animationDelay: '2s'
        }}
      /> */}

      <div className="absolute inset-0">
        {stars.map((star) => (
          <img
            key={star.id}
            src={Star}
            alt="Star"
            className={`absolute ${getSizeClass(star.size)} star-twinkle`}
            style={{
              top: star.top,
              left: star.left,
              right: star.right,
              bottom: star.bottom,
              transform: `rotate(${star.rotation}deg)`,
              animationDelay: `${star.delay}s`,
              filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 12px rgba(255, 255, 255, 0.6))'
            }}
          />
        ))}
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-white/5" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/5" />
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-gray-900/0" />
      <div className="absolute inset-0 bg-gradient-to-l from-white/5 via-transparent to-gray-900/0" />
    </div>
  );
};

export default BackgroundStyle;