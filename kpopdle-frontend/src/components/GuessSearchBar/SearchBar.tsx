// Search bar component
import React, { useState, useEffect, useRef } from "react";
import type { IdolListItem } from "../../interfaces/gameInterfaces";
import { AnimatePresence, motion } from "motion/react";
import SearchIcon from "../../assets/icons/magnifying-glass-fill.svg";


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
  const [isTouched, setIsTouched] = useState<number | null>(null);
  const pressTimeout = useRef<number | null>(null);

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
        .sort((a, b) => {
          const search = value.toLowerCase();
          const aName = a.artist_name.toLowerCase();
          const bName = b.artist_name.toLowerCase();

          const getPriority = (itemName: string, itemGroups: string[], isSoloist: boolean) => {
            if (itemName.startsWith(search)) return 1;
            if (itemName.includes(search)) return 2;
            if (itemGroups.some(g => g.toLowerCase().includes(search))) return 3;
            if (isSoloist && ("solo".includes(search) || search.includes("solo"))) return 4;
            return 5;
          };

          const aPriority = getPriority(aName, a.groups ?? [], a.groups?.length === 0);
          const bPriority = getPriority(bName, b.groups ?? [], b.groups?.length === 0);

          if (aPriority !== bPriority) return aPriority - bPriority;
          return aName.localeCompare(bName);
        })
        .slice(0, 10); // Limit to 10 suggestions
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: IdolListItem) => {
    onIdolSelect(suggestion.artist_name);
    setSelectedIdol(suggestion);
    setSuggestions([]);
  };
  // Return JSX
  return (
    <div ref={containerRef} className="relative w-fit h-fit rounded-3xl">
      <div className="relative max-xxs:w-80 max-xxs:h-13 xxs:w-90 xxs:h-13 xs:w-100 xs:h-13 max-w-full sm:w-140 sm:h-13 mx-auto flex items-center 
      border border-white/50 rounded-3xl bg-linear-to-r from-[#000000]/10 to-[#b43777]/10">
        <form className="w-full p-2" 
        onSubmit={(e) => {
          e.preventDefault();
                if (!disabled && selectedIdol && value.trim().length > 0 && (selectedIdol.artist_name.toLocaleLowerCase() === value.trim().toLocaleLowerCase())) {
                onSubmit?.();
                setShowList(false);
                setSelectedIdol(null);
                onIdolSelect("");
              }
          }}
        >
          <div className="flex items-center gap-2 w-full">
            <input
              className="grow h-9 px-3 text-white placeholder-white/60 border border-solid border-white/10
              rounded-3xl bg-white/5 shadow-lg focus:outline-none focus:ring-1 focus:ring-white/40 transition-all"
              value={value}
              onChange={handleInputChange}
              placeholder="Search for an idol or group..."
              onFocus={() => value.length > 0 && setShowList(true)}
            />
            <button
            onMouseEnter={() => setIsButtonHovered(true)}
            onMouseLeave={() => setIsButtonHovered(false)}
              className="shrink-0 w-10 h-10 text-white font-semibold rounded-full 
                  bg-linear-to-br from-[#b43777]/80 to-[#ce757a]/80 backdrop-blur-md shadow-lg
                  border border-white/80 transform transition-all duration-300 hover:brightness-125 hover:scale-108 
                  hover:border-white hover:cursor-pointer hover:bg-linear-to-br hover:from-[#b43777] hover:to-[#ce757a] hover:rotate-15"
              onClick={() => {
                if (!disabled && selectedIdol && value.trim().length > 0 && (selectedIdol.artist_name.toLocaleLowerCase() === value.trim().toLocaleLowerCase())) {
                onSubmit?.();
                setShowList(false);
                setSelectedIdol(null);
                onIdolSelect("");
                }
              }
            }
              disabled={disabled}
              type="button"
            >
              <motion.img 
                src={SearchIcon} 
                alt="G" 
                className="w-5.5 h-5.5 sm:w-5.5 sm:h-5.5 mx-auto" 
                draggable={false} 
                animate={{ scale: isButtonHovered ? 1.2 : 1 }}
                transition={{
                  type:"spring",
                  stiffness: 400,
                  damping: 20
                }}
              />
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
              className={`absolute left-0 top-full w-full mt-2 rounded-3xl
              ${suggestions.length === 1 ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden"} border border-white bg-linear-to-r from-black/5 via-[#b43777]/0 to-black/5
              backdrop-blur-md shadow-lg z-50 drop-shadow-md max-h-50 sm:max-h-60 transform-gpu will-change-transform`}
              // liquid glass if possible but using gradient for now (bg-linear-to-r from-[#000]/65 via-[#b43777]/80 to-[#000]/65)
            >
              {suggestions.map((suggestion) => {
                const isLast = suggestions.indexOf(suggestion) === suggestions.length - 1;
                const isUnique = suggestions.length === 1;

                return (
                <motion.li
                  onHoverStart={() => setHoveredId(suggestion.id)}
                  onHoverEnd={() => setHoveredId(null)}
                  onTouchStart={() => {
                    pressTimeout.current = setTimeout(() => setIsTouched(suggestion.id), 100);
                  }}
                  onTouchEnd={() => {
                    if (pressTimeout.current) {
                      clearTimeout(pressTimeout.current)
                    };
                    setIsTouched(null);
                  }}
                  onContextMenu={(e) => e.preventDefault()}
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
                    // #TODO: Fill animation not finished yet // 
                  className={`relative px-4 py-3 select-none cursor-pointer transition-colors duration-200 shadow=[0px_0px_0px_0px_rgba(0,0,0,0.35)]
                    hover:bg-linear-to-r hover:from-[#8a0449] hover:via-[#0d0314] hover:to-[#000000]/0 
                    bg-size-[200%_100%] bg-left hover:animate-[moveGradient_0.3s_linear_forwards]
                    ${isTouched === suggestion.id ? 
                      "bg-linear-to-r from-[#8a0449] via-[#0d0314] to-[#000000]/0 bg-size-[200%_100%] bg-left animate-[moveGradient_0.3s_linear_forwards]" : ""}
                    flex grow gap-4 items-center text-white drop-shadow-md 
                    border border-white/20 transform-gpu will-change-transform
                    hover:shadow-[2px_2px_12px_8px_rgba(0,0,0,0.35)]`} // had to remove backdrop-blur-md due "white corner glitch / artifact"
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion.image_path && (
                    <motion.img 
                    src={`${import.meta.env.VITE_API_URL}${suggestion.image_path}`}
                    alt={"Idol image"}
                    className="w-11 h-11 object-cover rounded-full border border-white"
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
