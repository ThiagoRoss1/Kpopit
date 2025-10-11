// Search bar component
import React, { useState, useEffect, useRef } from "react";
import type { IdolListItem } from "../../interfaces/gameInterfaces";
import { AnimatePresence, motion } from "motion/react";

interface SearchBarProps {
  allIdols: IdolListItem[];
  value: string;
  onSubmit?: () => void;
  onClose?: () => void;
  excludedIdols?: number[];
  disabled?: boolean;

  // Handle selection
  onIdolSelect: (idolName: string) => void;
}

const SearchBar = (props: SearchBarProps) => {
  const { allIdols, value, onIdolSelect, onSubmit, disabled, excludedIdols, onClose } =
    props;

  // Input value and Suggestions state
  const [suggestions, setSuggestions] = useState<IdolListItem[]>([]);
  const [showList, setShowList] = useState(false);
  const [selectedIdol, setSelectedIdol] = useState<IdolListItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowList(false);
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onIdolSelect(value);

    if (value.length > 0) {
      setShowList(true);
      const filteredSuggestions = allIdols
        .filter((idol: IdolListItem) => {
          const matchesName = idol.artist_name.toLowerCase().includes(value.toLowerCase());

          const matchesGroup = idol.groups?.some(group =>
            group.toLowerCase().includes(value.toLowerCase()));

          const isSoloist = (idol.groups?.length === 0) &&
          ("solo".includes(value.toLowerCase()) || value.toLowerCase().includes("solo") && (!idol.groups || idol.groups.length === 0));

          const isNotExcluded = !excludedIdols?.includes(idol.id);
          const matches = matchesName || matchesGroup || isSoloist; 

          return matches && isNotExcluded;
        })
        .slice(0, 10); // Limit to 10 suggestions
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: IdolListItem) => {
    onIdolSelect(suggestion.artist_name);
    setSelectedIdol(suggestion);
    setSuggestions([]);
  };
  // Return JSX
  return (
    <div ref={containerRef} className="relative w-fit h-fit rounded-3xl">
      <div className="relative w-full h-fit max-w-full sm:w-lg sm:h-13 mx-auto flex items-center 
      border border-white/50 rounded-3xl bg-gradient-to-r from-[#000000]/10 to-[#b43777]/10">
        <form className="w-full p-2">
          <div className="flex items-center gap-2 w-full">
            <input
              className="flex-grow h-9 px-3 text-white placeholder-white/60 border border-solid border-white/10
              rounded-3xl bg-white/5 shadow-lg focus:outline-none focus:ring-1 focus:ring-white/40 transition-all"
              value={value}
              onChange={handleInputChange}
              placeholder="Idol"
              disabled={disabled}
              onFocus={() => value.length > 0 && setShowList(true)}
            />
            <button
              className="flex-shrink-0 w-10 h-10 text-white font-semibold rounded-full 
                  bg-gradient-to-br from-[#b43777]/80 to-[#ce757a]/80 backdrop-blur-md shadow-lg
                  border border-white/80 hover:brightness-125 transition-all hover:scale-105 hover:border-white/100 cursor-pointer
                  hover:bg-gradient-to-br hover:from-[#b43777]/100 hover:to-[#ce757a]/100 duration-300"
              onClick={() => {
                if (!disabled && selectedIdol && value.trim().length > 0 && (selectedIdol.artist_name.toLocaleLowerCase() === value.trim().toLocaleLowerCase())) {
                onSubmit?.();
                setShowList(false);
                setSelectedIdol(null);
                onIdolSelect("");
              }
            }}
              disabled={disabled}
              type="button"
            >
              G
            </button>
          <AnimatePresence>
          {showList && suggestions.length > 0 && (
            <motion.ul
              initial={{
                y: -10,
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 50,
              }}
              exit={{
                y: -10,
                opacity: 0,
              }}
              className="absolute left-0 top-full w-full mt-2 rounded-3xl
              overflow-y-auto overflow-x-hidden border border-white bg-gradient-to-r from-[#000]/5 via-[#b43777]/0 to-[#000]/5
              backdrop-blur-md shadow-lg z-50 drop-shadow-md sm:max-h-60 transform-gpu will-change-transform"
              // liquid glass if possible but using gradient for now (bg-gradient-to-r from-[#000]/65 via-[#b43777]/80 to-[#000]/65)
            >
              {suggestions.map((suggestion) => {
                const isLast = suggestions.indexOf(suggestion) === suggestions.length - 1;
                const isUnique = suggestions.length === 1;

                return (
                <motion.li
                  onHoverStart={() => setHoveredId(suggestion.id)}
                  onHoverEnd={() => setHoveredId(null)}
                  whileHover={isUnique ? {
                    y: 0,
                    x: 20,
                    scale: 1.05,
                    translateZ: 30,
                    zIndex: 10,
                  } : isLast ? {
                    y: -6,
                    x: 20,
                    scale: 1.05,
                    translateZ: 30,
                    zIndex: 10,
                  } : {
                    y: 6,
                    x: 20,
                    scale: 1.05,
                    translateZ: 30,
                    zIndex: 10,
                }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 250, 
                    damping: 25 }}
                  className="relative px-4 py-3 cursor-pointer transition-colors duration-200
                    hover:bg-gradient-to-r hover:from-[#000]/100 hover:via-[#b43777]/100 hover:to-[#000]/100 hover:bg-black
                    flex flex-grow gap-4 items-center backdrop-blur-md text-white drop-shadow-md border border-white/20 
                    transform-gpu will-change-transform hover:shadow-[2px_2px_12px_8px_rgba(0,0,0,0.35)]"
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion.image_path && (
                    <motion.img 
                    src={`http://127.0.0.1:5000${suggestion.image_path}`} 
                    alt={"Idol image"}
                    className="w-11 h-11 object-cover rounded-full border-1 border-white"
                    animate={{ scale: hoveredId === suggestion.id ? 1.16 : 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}/>
                  )}
                  <p className="relative">
                  <span className=" font-normal text-base">
                    {`${suggestion.artist_name}`}
                  </span> <span className="text-base text-white">
                    {`(${suggestion.groups?.join(", ") ? suggestion.groups?.join(", ") : "Soloist"})`}
                  </span>
                  </p>
                </motion.li>
              );
              })}
            </motion.ul>
          )}
          </AnimatePresence>
        </div>
        </form>
      </div>
    </div>
  );
};

export default SearchBar;
