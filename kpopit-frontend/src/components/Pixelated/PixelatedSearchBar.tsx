import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { AlbumSearchResult } from "../../interfaces/gameInterfaces";
import { resolveCdnUrl } from "../../utils/imageUrl";
import SearchIcon from "../../assets/icons/magnifying-glass-fill.svg";

interface PixelatedSearchBarProps {
  allAlbums: AlbumSearchResult[];
  value: string;
  disabled?: boolean;
  excludedAlbums?: number[];
  onAlbumSelect: (text: string) => void;
  onAlbumSelectId?: (album: AlbumSearchResult) => void;
  onSubmit?: () => void;
  onClose?: () => void;
}

const formatDisplayName = (album: AlbumSearchResult) => `${album.name} (${album.group_name})`;

const PixelatedSearchBar = (props: PixelatedSearchBarProps) => {
  const { allAlbums, value, disabled, excludedAlbums, onAlbumSelect, onAlbumSelectId, onSubmit, onClose } = props;

  const [suggestions, setSuggestions] = useState<AlbumSearchResult[]>([]);
  const [showList, setShowList] = useState<boolean>(false);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumSearchResult | null>(null);

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
  }, [onClose]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onAlbumSelect(text);

    if (text.trim().length === 0) {
      setSuggestions([]);
      setSelectedAlbum(null);
      setShowList(false);
      return;
    }

    const search = text.toLowerCase();
    setShowList(true);

    const filtered = allAlbums
      .filter((album) => {
        const matches =
          album.name.toLowerCase().includes(search) ||
          album.group_name.toLowerCase().includes(search);
        return matches && !excludedAlbums?.includes(album.id);
      })
      .sort((a, b) => {
        const priority = (album: AlbumSearchResult) => {
          const name = album.name.toLowerCase();
          if (name.startsWith(search)) return 1;
          if (name.includes(search)) return 2;
          if (album.group_name.toLowerCase().includes(search)) return 3;
          return 4;
        };
        const pa = priority(a);
        const pb = priority(b);
        return pa !== pb ? pa - pb : a.name.localeCompare(b.name);
      })
      .slice(0, 20);

    setSuggestions(filtered);
    setSelectedAlbum(filtered[0] || null);
    if (filtered[0]) onAlbumSelectId?.(filtered[0]);
  };

  const handleSuggestionClick = (album: AlbumSearchResult) => {
    onAlbumSelect(formatDisplayName(album));
    onAlbumSelectId?.(album);
    setSelectedAlbum(album);
    setSuggestions([]);
    setShowList(false);
  };

  const submit = () => {
    if (!disabled && selectedAlbum) {
      onSubmit?.();
      setShowList(false);
      setSelectedAlbum(null);
      setSuggestions([]);
      onAlbumSelect("");
    }
  };

  return (
    <div ref={containerRef} className="relative z-30 w-full rounded-2xl">
      <div className="relative w-full xl:h-16 flex items-center rounded-3xl bg-neon-pink/5 border border-white backdrop-blur-lg
        shadow-[0_8px_24px_rgba(0,0,0,0.2),0_2px_6px_rgba(0,0,0,0.2)]">
        <form
          className="w-full p-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex items-center gap-2 w-full pl-1 pr-2 py-2">
            <input
              className="flex grow w-full h-11 px-4 bg-transparent border border-white/20 rounded-2xl text-ink placeholder-ink/40
              shadow-[0_8px_24px_rgba(0,0,0,0.1),0_2px_6px_rgba(0,0,0,0.1)]  
              text-base sm:text-lg font-medium focus:outline-none disabled:opacity-50"
              value={value}
              onChange={handleInputChange}
              placeholder="Type an album or group…"
              disabled={disabled}
              onFocus={() => value.trim().length > 0 && suggestions.length > 0 && setShowList(true)}
            />
            <button
              type="button"
              onClick={submit}
              disabled={disabled || !selectedAlbum}
              className="flex items-center gap-1.5 w-14.5 h-11 px-4 sm:px-4 p-2 rounded-full font-bold 
              bg-neon-pink border-b-2 border-ink shadow-[0_4px_0_var(--color-ink)] firefox:shadow-none firefox:drop-shadow-[0_4px_0_var(--color-ink)] firefox:active:drop-shadow-[0_1px_0_var(--color-ink)] transition-all duration-150
                hover:brightness-110 hover:cursor-pointer active:translate-y-1 active:shadow-[0_1px_0_var(--color-ink)]
                disabled:opacity-50 disabled:pointer-events-none"
            >
              <img src={SearchIcon} alt="Search Icon" aria-hidden="true" className="w-full h-full" draggable={false} />
            </button>

            <AnimatePresence>
              {showList && suggestions.length > 0 && (
                <motion.ul
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 50 }}
                  className="absolute left-0 top-full w-full mt-2 rounded-2xl overflow-y-auto overflow-x-hidden
                    searchbar-scroll border-2 border-ink/60 bg-[#fffaf3] shadow-[0_10px_30px_rgba(0,0,0,0.18)] z-50 max-h-60 sm:max-h-72 transform-gpu"
                >
                  {suggestions.map((album) => (
                    <motion.li
                      key={album.id}
                      onClick={() => handleSuggestionClick(album)}
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="relative px-3 py-2.5 select-none cursor-pointer transition-colors duration-150 transform-gpu
                        hover:bg-neon-pink/20 flex gap-3 items-center text-ink border-b border-ink/10 last:border-b-0"
                    >
                      {album.cover_path && (
                        <img
                          src={resolveCdnUrl(album.cover_path) ?? undefined}
                          alt=""
                          className="w-12 h-12 object-cover rounded-full border-2 border-ink shrink-0"
                          loading="eager"
                          draggable={false}
                        />
                      )}
                      <p className="relative flex flex-col leading-tight min-w-0">
                        <span className="font-bold text-ink/80 text-base truncate">{album.name}</span>
                        <span className="text-sm text-ink/55 truncate">
                          {album.group_name}
                        </span>
                      </p>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(PixelatedSearchBar);
