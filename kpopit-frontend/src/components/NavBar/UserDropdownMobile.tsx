import "./droplist.css";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useAuthUser } from "../../hooks/useAuthUser";
import { resolveAvatarUrl } from "../../utils/resolveAvatarUrl";

const UserDropdownMobile = () => {
    const { user, refreshAuth } = useAuth();
    const { logout } = useAuthUser();
    const navigate = useNavigate();

    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (
                containerRef.current &&
                !containerRef.current.contains(target) &&
                !target.closest("#user-menu-trigger")
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    if (!user) return null;

    const avatarSrc = resolveAvatarUrl(user.profile.avatar_url);
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
        <>
            <div 
                className="flex justify-center items-center"
                id="user-menu-trigger"
            >
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="w-8 h-8 rounded-full overflow-hidden bg-transparent"
                    aria-label="Open user menu"
                >
                    {avatarSrc ? (
                        <img
                            src={avatarSrc}
                            alt="User avatar"
                            className="w-full h-full rounded-full object-cover"
                            draggable={false}
                        />
                    ) : (
                        <div className="w-full h-full rounded-full bg-linear-to-b from-[#2a2a2a] to-[#0e0e0e]" />
                    )}
                </button>
            </div>

            <div
                className={`fixed inset-0 z-50 w-full h-screen flex items-start justify-center bg-black/90 backdrop-blur-3xl md:hidden overflow-y-auto pb-40
                transition-opacity duration-500 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className={`absolute top-1 right-3 w-10 h-10 flex items-center justify-center ${isOpen ? "rotate-180" : "rotate-0"} transition-transform duration-500 transform-gpu`}
                >
                    <X 
                        className={`w-8 h-8 text-neon-pink transition-all duration-500 transform-gpu ease-in-out
                        ${isOpen ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 -rotate-90"}`} />
                </button>

                <div
                    ref={containerRef}
                    className={`flex flex-col ${isOpen ? "mobile-navbar-enter" : "mobile-navbar-exit"} items-center gap-3 max-xxs:w-75 xxs:w-90 xs:w-100 sm:w-100 bg-[#0a0a0a] border-b-2 border-t-2 border-neon-pink rounded-3xl mt-20 py-8 px-6`}
                >
                    {avatarSrc ? (
                        <img
                            src={avatarSrc}
                            alt="User avatar"
                            className="w-16 h-16 rounded-full object-cover"
                            draggable={false}
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-linear-to-b from-[#2a2a2a] to-[#0e0e0e]" />
                    )}
                    <div className="flex flex-col items-center text-center font-sans">
                        <span title={displayName} className="text-white text-xl font-black truncate max-w-50">
                            {displayName}
                        </span>
                        
                        <span title={username} className="text-gray-400 text-sm font-bold truncate max-w-50">
                            @{username}
                        </span>
                    </div>

                    <div className="w-full border-t border-neon-pink/40 my-2" />

                    <Link
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-start gap-4 px-4 h-12 w-full text-left text-white rounded-[10px] bg-transparent hover:bg-gray-700/30 hover:text-neon-pink transition-colors duration-300 font-sans font-bold"
                    >
                        <User className="w-4 h-4" />
                        <span className="text-sm sm:text-base">Profile</span>
                    </Link>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center justify-start gap-4 px-4 h-12 w-full text-left text-white rounded-[10px] bg-transparent hover:bg-gray-700/30 hover:text-neon-pink transition-colors duration-300 hover:cursor-pointer font-sans font-bold"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm sm:text-base">Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default UserDropdownMobile;
