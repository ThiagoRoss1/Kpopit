// Search bar component
import React, { useState } from "react";
import type { IdolListItem } from "../../interfaces/gameInterfaces";

interface SearchBarProps {
  allIdols: IdolListItem[];
  value: string;
  onSubmit?: () => void;
  excludedIdols?: number[];
  disabled?: boolean;

  // Handle selection
  onIdolSelect: (idolName: string) => void;
}

const SearchBar = (props: SearchBarProps) => {
  const { allIdols, value, onIdolSelect, onSubmit, disabled, excludedIdols } =
    props;

  // Input value and Suggestions state
  const [suggestions, setSuggestions] = useState<IdolListItem[]>([]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onIdolSelect(value);

    if (value.length > 0) {
      const filteredSuggestions = allIdols
        .filter((idol: IdolListItem) => {
          const matches = idol.artist_name
            .toLowerCase()
            .includes(value.toLowerCase());
          const isNotExcluded = !excludedIdols?.includes(idol.id);
          return matches && isNotExcluded;
        })
        .slice(0, 10); // Limit to 10 suggestions
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: IdolListItem) => {
    onIdolSelect(suggestion.artist_name);
    setSuggestions([]);
  };

  // Return JSX
  return (
    <div className="relative w-full h-fit max-w-full sm:max-w-[458px] max-h-[50px] mx-auto flex items-center border border-white/80 rounded-[20px] 
    bg-gradient-to-r from-[#000000]/40 via-[#b43777]/60 to-[#000000]/40 shadow-lg backdrop-blur-md">
      <form className="w-full p-2">
        <div className="flex items-center gap-2 w-full">
          <input
            className="flex-grow h-9 px-3 text-white placeholder-gray-400 border border-solid border-white/20 
              rounded-[16px] bg-white/30 backdrop-blur-md shadow-lg focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
            value={value}
            onChange={handleInputChange}
            placeholder="Idol"
            disabled={disabled}
          />
          <button
            className="flex-shrink-0 w-10 h-10 text-white font-semibold rounded-full 
                bg-gradient-to-br from-[#b43777] to-[#000] backdrop-blur-md shadow-lg
                border border-white/80 hover:brightness-125 transition-all hover:scale-105 hover:border-white/100 cursor-pointer"
            onClick={onSubmit}
            disabled={disabled}
            type="button"
          >
            G
          </button>
        {suggestions.length > 0 && (
          <ul
            className="absolute left-0 top-full w-full mt-2 overflow-hidden rounded-xl
            border border-white bg-gradient-to-r from-[#000]/65 via-[#b43777]/80 to-[#000]/65 backdrop-blur-lg shadow-lg text-white z-50 drop-shadow-md"
            // liquid glass if possible but using gradient for now (bg-gradient-to-r from-[#000]/65 via-[#b43777]/80 to-[#000]/65)
          >
            {suggestions.map((suggestion) => (
              <li
                className="px-5 py-3 cursor-pointer transition-colors duration-200
                  hover:bg-gradient-to-r hover:from-[#000]/65 hover:via-[#b43777]/80 hover:to-[#000]/65
                  flex items-center backdrop-blur-md text-white drop-shadow-md border border-white/20"
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion.artist_name}
              </li>
            ))}
          </ul>
        )}
      </div>
      </form>
    </div>
  );
};

export default SearchBar;
