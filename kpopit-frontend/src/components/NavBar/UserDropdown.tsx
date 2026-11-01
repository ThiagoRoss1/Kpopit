import { Link, useNavigate } from "react-router";
import { LogOut, User } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { useAuthUser } from "../../hooks/useAuthUser";
import { resolveAvatarUrl } from "../../utils/resolveAvatarUrl";
import { loadProfileStats } from "../../pages/User/profileData";
import IntentLink from "../Links/IntentLink";

const prefetchProfile = () => void loadProfileStats();

// Profile-menu items: the hover pill is a layer behind the label that fades in (opacity only),
// and the item lifts on hover and sinks on press.
const menuItemClasses = cn(
    "pp-focus relative flex items-center gap-3 h-11 px-3 rounded-[13px] border-2 border-transparent",
    "font-semibold text-[15px] text-(--chip-ink) no-underline cursor-pointer",
    "transition-transform duration-300 ease-(--ease-settle) transform-gpu",
    "hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.75 active:duration-180",
    "before:absolute before:-inset-0.5 before:-z-1 before:rounded-[inherit] before:border-2 before:border-(--ink)",
    "before:bg-(--chip-hover) before:shadow-[2px_3px_0_var(--ctl-off),var(--in)] before:opacity-0",
    "before:transition-[opacity,box-shadow] before:duration-300",
    "hover:before:opacity-100 active:before:opacity-100 active:before:shadow-[0_0_0_var(--ctl-off),var(--in)]",
);

interface UserDropdownProps {
    open: boolean;
    onToggle: () => void;
}

/** Login for guests; for members the avatar ring opens Profile + Logout. Same box while the
 *  session resolves, so the bar never shifts. The navbar owns the open state (one menu at a time). */
const UserDropdown = ({ open, onToggle }: UserDropdownProps) => {
    const { isAuthenticated, isLoading, user, refreshAuth } = useAuth();
    const { logout } = useAuthUser();
    const navigate = useNavigate();

    if (isLoading) return <span aria-hidden className="block w-12 h-10" />;

    if (!isAuthenticated || !user) {
        return (
            <Link
                to="/login"
                className={cn(
                    "pp-press pp-focus flex-none inline-flex items-center box-border h-10 px-4.5",
                    "rounded-full border-2 border-(--ink) bg-[#FF3399] [--pp-in:var(--in-pink)] shadow-[2px_3px_0_var(--ink),var(--in-pink)]",
                    "font-bold text-[15.5px] text-[#1A1418] whitespace-nowrap no-underline",
                )}
            >
                Login
            </Link>
        );
    }

    const avatar = resolveAvatarUrl(user.profile.avatar_url, user.profile.updated_at);
    const username = user.user_credentials.username;

    const handleLogout = async () => {
        try {
            await logout();
            await refreshAuth();
            navigate("/login");
        } catch (error) {
            if (import.meta.env.DEV) console.error("Logout failed:", error);
        }
    };

    return (
        <div className="relative mx-1">
            {/* The avatar: its ring widens on hover and only the photo zooms (an image scaled by
                itself stays sharp; one scaled by its parent is redrawn when the motion ends). */}
            <button
                type="button"
                aria-label="User menu"
                aria-expanded={open}
                onClick={onToggle}
                className={cn(
                    "pp-focus group relative block flex-none size-10 box-border p-0 overflow-hidden",
                    "rounded-full bg-(--ink) cursor-pointer",
                    "shadow-[0_0_0_2px_var(--ink),0_0_0_4.5px_#FF8AC4,0_0_0_6.5px_var(--ink)]",
                    "hover:shadow-[0_0_0_2px_var(--ink),0_0_0_5px_#FF8AC4,0_0_0_7px_var(--ink)]",
                    "transition-[box-shadow,scale] duration-400 ease-(--ease-settle) transform-gpu",
                    "active:scale-95 active:duration-180 aria-expanded:scale-95",
                )}
            >
                {avatar ? (
                    <img
                        src={avatar}
                        alt=""
                        className="block size-full object-cover transition-transform duration-500 ease-(--ease-settle) group-hover:scale-108"
                        draggable={false}
                    />
                ) : (
                    <User className="size-5 mx-auto text-[#FF8AC4]" strokeWidth={2.6} aria-hidden />
                )}
            </button>

            {open && (
                <div
                    className={cn(
                        "absolute right-0 top-[calc(100%+20px)] @max-[860px]:top-[calc(100%+17px)] z-40 flex flex-col gap-0.5 w-60 box-border p-2",
                        "rounded-[20px] border-2 border-(--ink) bg-(--menu-bg) shadow-[3px_4px_0_var(--ctl-off),var(--in)]",
                        "animate-[puffMenu_0.38s_var(--ease-settle)_both] origin-[calc(100%-20px)_0]",
                    )}
                >
                    <div className="min-w-0 px-3 pt-2 pb-2.5 mb-1 border-b-2 border-(--rule)">
                        <p title={user.profile.display_name} className="m-0 font-bold text-base text-(--chip-ink) truncate">
                            {user.profile.display_name}
                        </p>

                        <p title={username} className="m-0 font-medium text-[13px] text-(--muted) truncate">
                            @{username}
                        </p>
                    </div>

                    <IntentLink to={`/profile/${username.toLowerCase()}`} onIntent={prefetchProfile} className={menuItemClasses}>
                        <User className="size-4" strokeWidth={2.6} aria-hidden />
                        Profile
                    </IntentLink>

                    <button type="button" onClick={handleLogout} className={cn(menuItemClasses, "bg-transparent text-left")}>
                        <LogOut className="size-4" strokeWidth={2.6} aria-hidden />
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserDropdown;
