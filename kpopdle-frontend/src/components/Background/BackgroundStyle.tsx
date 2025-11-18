import { useMemo } from "react";
import { motion } from "framer-motion";
import Star from "../../assets/icons/star-four-fill.svg";

interface BackgroundStyleProps {
    attempts: number;
}

const BackgroundStyle = (props: BackgroundStyleProps) => {
    const { attempts } = props;
    const stars = useMemo(() => [

        // Left Side Stars
        { id: 1, top: '8%', left: '18%', size: 'super-large', rotation: 12 },
        { id: 2, top: '14%', left: '11%', size: 'extra-large', rotation: -12 },
        { id: 3, top: '-8%', left: '1%', size: 'extreme-large', rotation: -10 },
        { id: 4, top: '24%', left: '4%', size: 'sparkle', rotation: -40 },
        { id: 5, top: '30%', left: '17%', size: 'extra-large', rotation: 20 },
        { id: 6, top: '25%', left: '4%', size: 'super-large', rotation: 10 },
        { id: 7, top: '4%', left: '15%', size: 'particle', rotation: 10 },
        { id: 8, top: '40%', left: '-4%', size: 'extreme-large', rotation: 10 },
        { id: 9, top: '34%', left: '16%', size: 'sparkle', rotation: -20 },
        { id: 10, bottom: '35%', left: '12%', size: 'extreme-large', rotation: -25 },
        { id: 11, bottom: '35%', left: '4%', size: 'medium', rotation: -10 },
        { id: 12, bottom: '14%', left: '12%', size: 'large', rotation: 22 },
        { id: 13, bottom: '-8%', left: '-2%', size: 'extreme-large', rotation: -15 },
        { id: 14, bottom: '5%', left: '4%', size: 'large', rotation: 10 },
        { id: 15, bottom: '13%', left: '17%', size: 'particle', rotation: 0 },
        { id: 16, bottom: '6%', left: '17%', size: 'super-large', rotation: 0 },


        // Right Side Stars
        { id: 17, top: '8%', right: '18%', size: 'super-large', rotation: -12 },
        { id: 18, top: '14%', right: '11%', size: 'extra-large', rotation: 12 },
        { id: 19, top: '-8%', right: '1%', size: 'extreme-large', rotation: 10 },
        { id: 20, top: '24%', right: '4%', size: 'sparkle', rotation: 40 },
        { id: 21, top: '30%', right: '17%', size: 'extra-large', rotation: -20 },
        { id: 22, top: '25%', right: '4%', size: 'super-large', rotation: -10 },
        { id: 23, top: '4%', right: '15%', size: 'particle', rotation: -10 },
        { id: 24, top: '40%', right: '-4%', size: 'extreme-large', rotation: -10 },
        { id: 25, top: '34%', right: '16%', size: 'sparkle', rotation: 20 },
        { id: 26, bottom: '35%', right: '12%', size: 'extreme-large', rotation: 25 },
        { id: 27, bottom: '35%', right: '4%', size: 'medium', rotation: 10 },
        { id: 28, bottom: '14%', right: '12%', size: 'large', rotation: -22 },
        { id: 29, bottom: '-8%', right: '-2%', size: 'extreme-large', rotation: 15 },
        { id: 30, bottom: '5%', right: '4%', size: 'large', rotation: -10 },
        { id: 31, bottom: '13%', right: '17%', size: 'particle', rotation: 0 },
        { id: 32, bottom: '6%', right: '17%', size: 'super-large', rotation: 0 },
    ], []);

  const getSizeClass = (size: string) => {
    switch(size) {
      case 'extreme-large': return 'w-30 h-30 sm:w-40 sm:h-40';  
      case 'super-large': return 'w-14 h-14 sm:w-22 sm:h-22';
      case 'extra-large': return 'w-10 h-10 sm:w-16 sm:h-16';
      case 'large': return 'w-6 h-6 sm:w-10 sm:h-10';
      case 'medium': return 'w-4 h-4 sm:w-6 sm:h-6';
      case 'sparkle': return 'w-3 h-3 sm:w-5 sm:h-5';
      case 'particle': return 'w-1 h-1 sm:w-4 sm:h-4';
      default: return 'sm:w-6 sm:h-6';
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
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="absolute inset-0 bg-linear-to-br from-[#090311] via-[#050416] to-[#050822]" />
        <div className="absolute inset-0 top-0 bg-black/0" />
        {attempts < 1 && (
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
          <div 
            key={star.id}
            className="absolute"
            style={{
              top: star.top,
              left: star.left,
              right: star.right,
              bottom: star.bottom,
              transform: `rotate(${star.rotation}deg)`,
            }}
          >
          <img
            src={Star}
            alt="Star"
            className={`${getSizeClass(star.size)} star-twinkle origin-center`}
            style={{
              animationDelay: `${starsDelay(star.size) + (star.id % 5) * 0.3 }s`,
              filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.4)) drop-shadow(0 0 10px rgba(255, 255, 255, 0.4))'
            }}
          />
          {/* Debugging IDs */}
          {/* <span key={star.id} className="absolute text-white text-xs">{star.id}</span> */}
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

export default BackgroundStyle;



    // const stars = useMemo(() => [

    //     // Large stars (w-8 h-8 = 32px)
    //     { id: 1, top: '8%', left: '10%', size: 'extra-large', rotation: 12, delay: 0 },
    //     { id: 2, top: '18%', left: '16%', size: 'medium', rotation: 16, delay: 1 },
    //     { id: 3, top: '6%', left: '4%', size: 'small', rotation: 20, delay: 0 },
    //     { id: 4, top: '20%', right: '20%', size: 'medium', rotation: 45, delay: 1 },
    //     { id: 5, bottom: '25%', left: '10%', size: 'large', rotation: -12, delay: 2 },
    //     { id: 6, bottom: '15%', right: '15%', size: 'medium', rotation: 90, delay: 0.5 },
    //     { id: 7, top: '35%', left: '5%', size: 'large', rotation: 180, delay: 1.5 },
    //     { id: 8, top: '45%', right: '8%', size: 'large', rotation: -45, delay: 2.5 },
        
    //     // Medium stars (w-5 h-5 = 20px)
    //     { id: 9, top: '60%', left: '25%', size: 'medium', rotation: 30, delay: 0.3 },
    //     { id: 10, top: '15%', left: '60%', size: 'small', rotation: -60, delay: 1.3 },
    //     { id: 11, bottom: '40%', right: '40%', size: 'medium', rotation: 75, delay: 2.3 },
    //     { id: 12, top: '75%', right: '25%', size: 'medium', rotation: -30, delay: 0.8 },
        
    //     // Small stars (w-3 h-3 = 12px)
    //     { id: 13, top: '30%', left: '80%', size: 'small', rotation: 15, delay: 1.8 },
    //     { id: 14, bottom: '60%', left: '70%', size: 'small', rotation: -15, delay: 2.8 },
    //     { id: 15, top: '80%', left: '40%', size: 'small', rotation: 60, delay: 0.2 },
    //     { id: 16, top: '5%', right: '45%', size: 'small', rotation: -90, delay: 1.2 },
    //     { id: 17, bottom: '5%', left: '35%', size: 'small', rotation: 135, delay: 2.2 },
        
    //     // Extra sparkles
    //     { id: 18, top: '25%', left: '90%', size: 'sparkle', rotation: 45, delay: 0.7 },
    //     { id: 19, bottom: '80%', right: '5%', size: 'sparkle', rotation: -45, delay: 1.7 },
    //     { id: 20, top: '50%', left: '3%', size: 'sparkle', rotation: 90, delay: 2.7 },
    //     { id: 21, bottom: '30%', right: '60%', size: 'sparkle', rotation: -135, delay: 0.4 },
    //     { id: 22, top: '65%', right: '10%', size: 'sparkle', rotation: 180, delay: 1.4 }
    // ], []);