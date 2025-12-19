import { useState, useEffect } from "react";
import Confetti from "react-confetti";

export const WinnerExplosion = (props: { onComplete: () => void }) => {
  const { onComplete } = props;

  const [isExploding, setIsExploding] = useState(true);
  const [opacity, setOpacity] = useState(1);

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, 1500);

    const removeTimer = setTimeout(() => {
      setIsExploding(false);
      onComplete?.();
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [onComplete]);

  if (!isExploding) return null;

  return (
  <div 
    className="fixed top-0 left-0 w-full h-full pointer-events-none z-50 transition-opacity duration-1000 ease-out"
    style={{opacity: opacity}}>
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={400}
        confettiSource={{x: windowSize.width / 2, y: windowSize.height / 2, w: 0, h: 0}}

        gravity={0.2}
        initialVelocityX={20}
        initialVelocityY={20}
        colors={['#B43777', '#e70a7d', '#FFFFFF', '#242424', '#000000']}
        />
    </div>
  ); 
};
