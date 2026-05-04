import "./droplist.css";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useAuthUser } from "../../hooks/useAuthUser";

interface UserDropdownMobileProps {
    isOpen: boolean;
    onClose: () => void;
}

const UserDropdownMobile = ({ isOpen, onClose }: UserDropdownMobileProps) => {
    const { user, refreshAuth } = useAuth();
    const { logout } = useAuthUser();
    const navigate = useNavigate();

    const [isRendered, setIsRendered] = useState(isOpen);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (
                isOpen &&
                containerRef.current &&
                !containerRef.current.contains(target) &&
                !target.closest("#user-menu-trigger")
            ) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
        } else {
            const timer = setTimeout(() => setIsRendered(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isRendered || !user) return null;

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
        <div
            className={`fixed inset-0 z-50 w-full h-screen flex items-start justify-center bg-black/90 backdrop-blur-3xl md:hidden overflow-y-auto pb-40
            transition-opacity duration-500 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
            <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white hover:text-neon-pink transition-colors duration-200"
            >
                <X size={28} />
            </button>

            <div
                ref={containerRef}
                className={`flex flex-col ${isOpen ? "mobile-navbar-enter" : "mobile-navbar-exit"} items-center gap-3 max-xxs:w-75 xxs:w-90 xs:w-100 sm:w-100 bg-[#0a0a0a] border border-neon-pink/30 rounded-2xl mt-20 py-8 px-6`}
            >
                <img
                    src={avatarSrc}
                    alt="User avatar"
                    className="w-16 h-16 rounded-full object-cover"
                    draggable={false}
                />
                <div className="flex flex-col items-center text-center font-sans">
                    <span title={displayName} className="text-white text-xl font-black truncate max-w-50">
                        {displayName}
                    </span>
                    <span title={username} className="text-gray-400 text-sm font-bold truncate max-w-50">
                        @{username}
                    </span>
                </div>

                <div className="w-full border-t border-neon-pink/20 my-2" />

                <Link
                    to="/"
                    onClick={onClose}
                    className="flex items-center justify-start gap-4 px-4 h-12 w-full text-left text-white rounded-[10px] bg-transparent hover:bg-gray-700/30 hover:text-neon-pink transition-colors duration-300 font-sans font-bold"
                >
                    <User size={16} />
                    <span className="text-sm sm:text-base">Profile</span>
                </Link>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center justify-start gap-4 px-4 h-12 w-full text-left text-white rounded-[10px] bg-transparent hover:bg-gray-700/30 hover:text-neon-pink transition-colors duration-300 hover:cursor-pointer font-sans font-bold"
                >
                    <LogOut size={16} />
                    <span className="text-sm sm:text-base">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default UserDropdownMobile;
