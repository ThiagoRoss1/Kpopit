import { Link, useNavigate } from "react-router";
import { LogOut, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useAuthUser } from "../../hooks/useAuthUser";
import { resolveAvatarUrl } from "../../utils/resolveAvatarUrl";
import { loadProfileStats } from "../../pages/User/profileData";
import IntentLink from "../Links/IntentLink";

const prefetchProfile = () => void loadProfileStats();

const menuItem = "nb-uitem pp-focus flex items-center gap-3 h-11 px-3 rounded-[13px] border-2 border-transparent font-semibold text-[15px] text-(--chip-ink) no-underline cursor-pointer";

/** Login for guests; for members the avatar ring opens Profile + Logout. Same box while the
 *  session resolves, so the bar never shifts. The navbar owns the open state (one menu at a time). */
export default function NavAuthSlot({ open, onToggle }: { open: boolean; onToggle: () => void }) {
    const { isAuthenticated, isLoading, user, refreshAuth } = useAuth();
    const { logout } = useAuthUser();
    const navigate = useNavigate();

    if (isLoading) return <span aria-hidden className="block w-12 h-9" />;

    if (!isAuthenticated || !user) {
        return (
            <Link
                to="/login"
                className="pp-press pp-focus flex-none box-border h-[38px] px-4 inline-flex items-center rounded-full border-2 border-(--ink) bg-[#FF3399] text-[#1A1418] font-bold text-sm no-underline [--pp-in:var(--in-pink)] shadow-[2px_3px_0_var(--ink),var(--in-pink)]"
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
            <button
                type="button"
                aria-label="User menu"
                aria-expanded={open}
                onClick={onToggle}
                className="nb-av pp-focus relative block flex-none w-9 h-9 box-border rounded-full overflow-hidden bg-(--ink) p-0 cursor-pointer"
            >
                {avatar ? (
                    <img src={avatar} alt="" className="block w-full h-full object-cover" draggable={false} />
                ) : (
                    <User className="w-5 h-5 mx-auto text-[#FF8AC4]" strokeWidth={2.6} aria-hidden />
                )}
            </button>
            {open && (
                <div className="nb-menu absolute right-0 top-[calc(100%+22px)] @max-[760px]:top-[calc(100%+19px)] z-40 w-60 box-border p-2 rounded-[20px] border-2 border-(--ink) bg-(--menu-bg) shadow-[3px_4px_0_var(--ctl-off),var(--in)] flex flex-col gap-0.5 origin-[calc(100%-20px)_0]">
                    <div className="px-3 pt-2 pb-2.5 mb-1 border-b-2 border-(--rule) min-w-0">
                        <p title={user.profile.display_name} className="m-0 font-bold text-base text-(--chip-ink) truncate">{user.profile.display_name}</p>
                        <p title={username} className="m-0 font-medium text-[13px] text-(--muted) truncate">@{username}</p>
                    </div>
                    <IntentLink to={`/profile/${username.toLowerCase()}`} onIntent={prefetchProfile} className={menuItem}>
                        <User className="w-4 h-4" strokeWidth={2.6} aria-hidden />
                        Profile
                    </IntentLink>
                    <button type="button" onClick={handleLogout} className={`${menuItem} bg-transparent text-left`}>
                        <LogOut className="w-4 h-4" strokeWidth={2.6} aria-hidden />
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}
