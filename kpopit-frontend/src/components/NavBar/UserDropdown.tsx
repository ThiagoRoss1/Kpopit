import "./droplist.css";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useAuthUser } from "../../hooks/useAuthUser";

const UserDropdown = () => {
    const { user, refreshAuth } = useAuth();
    const { logout } = useAuthUser();
    const navigate = useNavigate();

    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (containerRef.current && !containerRef.current.contains(target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    if (!user) return null;

    const avatarSrc = `${import.meta.env.VITE_IMAGE_BUCKET_URL}${user.profile.avatar_url}`;
    const displayName = user.profile.display_name;
    const username = user.user_credentials.username;

    const handleLogout = async () => {
        try {
            await logout();
            await refreshAuth();
            navigate("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-transparent hover:scale-105 hover:cursor-pointer transition-transform duration-300 transform-gpu"
                aria-label="User menu"
                aria-expanded={isOpen}
            >
                <img
                    src={avatarSrc}
                    alt="User avatar"
                    className="w-full h-full rounded-full object-cover"
                    draggable={false}
                />
            </button>

            <div
                data-state={isOpen ? "open" : "closed"}
                className="droplist-base absolute right-0 top-full mt-3 w-60 z-50 bg-[#0a0a0a] rounded-2xl shadow-[4px_4px_0px_rgba(255,51,153,1)] border-t border-neon-pink overflow-hidden"
            >
                {/* Header */}
                <div className="flex flex-row items-center gap-3 px-4 py-3 border-b border-neon-pink/20">
                    <img
                        src={avatarSrc}
                        alt="User avatar"
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                        draggable={false}
                    />
                    <div className="flex flex-col min-w-0 font-sans">
                        <span title={displayName} className="text-white font-black truncate max-w-35">
                            {displayName}
                        </span>
                        <span title={username} className="text-gray-400 text-sm font-bold truncate max-w-35">
                            @{username}
                        </span>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-1.5 px-2 py-2 font-sans font-bold">
                    <Link
                        to="/"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-start gap-4 px-4 h-12 text-left text-white rounded-[10px]
                        bg-transparent hover:bg-gray-700/30 hover:text-neon-pink transition-colors duration-300"
                    >
                        <User size={16} />
                        <span className="text-sm sm:text-base">Profile</span>
                    </Link>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center justify-start gap-4 px-4 h-12 text-left text-white rounded-[10px]
                        bg-transparent hover:bg-gray-700/30 hover:text-neon-pink
                        hover:cursor-pointer transition-colors duration-300"
                    >
                        <LogOut size={16} />
                        <span className="text-sm sm:text-base">Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserDropdown;
