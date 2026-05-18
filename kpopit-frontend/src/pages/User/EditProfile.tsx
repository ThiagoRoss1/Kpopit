import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Camera, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { updateProfile } from "../../services/api";
import { resolveAvatarUrl } from "../../utils/resolveAvatarUrl";
import EditProfileModal from "./EditProfileModal";
import AvatarModal from "./AvatarModal";
import UsernameModal from "./UsernameModal";
import PasswordModal from "./PasswordModal";
import EmailModal from "./EmailModal";
import "./EditProfile.css";

type SubModal = "none" | "avatar" | "username" | "password" | "email";

interface EditProfileProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: "fields" | "avatar";
}

const censorEmail = (email: string): string => {
    const [local, domain] = email.split("@");
    if (!local || !domain) return email;
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}***${local.slice(-1)}@${domain}`;
};

const extractError = (err: unknown): string | null => {
    if (typeof err === "object" && err !== null && "response" in err) {
        const r = (err as { response?: { data?: { error?: string } } }).response;
        if (r?.data?.error) return r.data.error;
    }
    return null;
};

const EditProfile = (props: EditProfileProps) => {
    const { isOpen, onClose, initialTab = "fields" } = props;

    const { user, refetchUser } = useAuth();

    const credentials = user?.user_credentials;
    const profile = user?.profile;
    const currentDisplayName = profile?.display_name ?? "";
    const currentUsername = credentials?.username ?? "";
    const currentEmail = credentials?.email ?? "";
    const currentAvatarUrl = profile?.avatar_url ?? null;
    const avatarVersion = profile?.updated_at;

    const [subModal, setSubModal] = useState<SubModal>("none");
    const [displayName, setDisplayName] = useState(currentDisplayName);
    const [showEmail, setShowEmail] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const DISPLAY_NAME_MAX_LENGTH = 30;

    // Reset when the modal (re)opens.
    useEffect(() => {
        if (!isOpen) return;
        setDisplayName(currentDisplayName);
        setShowEmail(false);
        setSaveError(null);
        setSubModal(initialTab === "avatar" ? "avatar" : "none");
    }, [isOpen, initialTab, currentDisplayName]);

    const saveMutation = useMutation({
        mutationFn: (name: string) => updateProfile({ display_name: name }),
        onSuccess: async () => {
            await refetchUser();
            onClose();
        },
        onError: (err) => {
            setSaveError(extractError(err) ?? "Could not save changes");
        },
    });

    const trimmedName = displayName.trim();
    const hasNameChange = trimmedName.length > 0 && trimmedName !== currentDisplayName;
    const canSave = hasNameChange && trimmedName.length <= DISPLAY_NAME_MAX_LENGTH && !saveMutation.isPending;

    const avatarSrc = currentAvatarUrl ? resolveAvatarUrl(currentAvatarUrl, avatarVersion) : null;

    // While a sub-modal is open, the main modal stays mounted but hidden
    // so its state survives — the sub-modal's "Return" simply flips back.
    const mainOpen = isOpen && subModal === "none";

    if (!isOpen || !user) {
        return null;
    }

    return (
        <>
            <EditProfileModal
                isOpen={mainOpen}
                onClose={onClose}
                title="Edit Profile"
            >
                <div className="px-5 sxs:px-6 py-5 flex flex-col gap-5">
                    {/* Avatar */}
                    <div className="ep-field flex flex-col items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSubModal("avatar")}
                            disabled={saveMutation.isPending}
                            className="group relative grid place-items-center w-25 h-25 sxs:w-28 sxs:h-28
                                rounded-full overflow-hidden border-[3px] border-neon-pink
                                hover:shadow-[2px_2px_0px_rgba(255,51,153,0.5)]
                                hover:cursor-pointer transition-all duration-200 transform-gpu
                                disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {avatarSrc ? (
                                <img
                                    src={avatarSrc}
                                    alt="Avatar"
                                    className="w-full h-full object-cover transform-gpu"
                                    draggable={false}
                                />
                            ) : (
                                <div className="w-full h-full bg-linear-to-b from-[#2a2a2a] to-[#0e0e0e]" />
                            )}
                            <div className="absolute inset-0 grid place-items-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Camera className="w-8 h-8 text-white/80 drop-shadow" />
                            </div>
                        </button>
                        
                        <span className="text-sm text-white/50 font-black">
                            Tap to change your avatar
                        </span>
                    </div>

                    {/* Display name */}
                    <div className="ep-field flex flex-col gap-2">
                        <label className="pl-1 text-[12px] font-black uppercase tracking-[0.15em] text-white/80">
                            Display Name
                        </label>

                        <div className="ep-input relative h-13 rounded-2xl overflow-hidden bg-[#0a0a0a]">
                            <User className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-white" />

                            <input
                                type="text"
                                value={displayName}
                                maxLength={DISPLAY_NAME_MAX_LENGTH}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your stage name"
                                className="w-full h-full pl-11 pr-14 bg-[#0a0a0a] text-sm font-bold text-white placeholder:text-neutral-700 focus:outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-black uppercase tracking-widest text-white/40">
                                {displayName.length}/{DISPLAY_NAME_MAX_LENGTH}
                            </span>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="ep-field flex flex-col gap-2">
                        <label className="pl-1 text-[12px] font-black uppercase tracking-[0.15em] text-white/80">
                            Email
                        </label>

                        <div className="flex flex-row items-stretch gap-2">
                            <div className="ep-input flex-1 min-w-0 relative h-13 rounded-2xl overflow-hidden bg-[#0a0a0a]">
                                <Mail className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-neutral-500" />

                                <div className="flex items-center w-full h-full pl-11 pr-12 text-sm font-bold text-white/80">
                                    {currentEmail
                                        ? (showEmail ? currentEmail : censorEmail(currentEmail))
                                        : <span className="text-neutral-700">No email registered</span>}
                                </div>

                                {currentEmail && (
                                    <button
                                        type="button"
                                        onClick={() => setShowEmail((s) => !s)}
                                        aria-label={showEmail ? "Hide email" : "Show email"}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white hover:cursor-pointer transition-colors"
                                    >
                                        {showEmail ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setSubModal("email")}
                                className="shrink-0 px-4 self-stretch rounded-2xl text-[12px] font-black uppercase tracking-[0.2em]
                                    border-2 border-white/20 text-white/80
                                    hover:border-neon-pink hover:text-neon-pink hover:cursor-pointer
                                    transition-colors duration-200"
                            >
                                Edit
                            </button>
                        </div>
                    </div>

                    {/* Username */}
                    <div className="ep-field flex flex-col gap-2">
                        <label className="pl-1 text-[12px] font-black uppercase tracking-[0.15em] text-white/80">
                            Username
                        </label>

                        <div className="flex flex-row items-stretch gap-2">
                            <div className="ep-input flex-1 min-w-0 relative h-13 rounded-2xl overflow-hidden bg-[#0a0a0a]">
                                <User className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-neutral-500" />

                                <div className="flex items-center w-full h-full pl-11 pr-3 text-sm font-bold text-white/80 truncate">
                                    @{currentUsername}
                                </div>
                            </div>
                            
                            <button
                                type="button"
                                onClick={() => setSubModal("username")}
                                className="shrink-0 px-4 self-stretch rounded-2xl text-[12px] font-black uppercase tracking-[0.2em]
                                    border-2 border-white/20 text-white/80
                                    hover:border-neon-pink hover:text-neon-pink hover:cursor-pointer
                                    transition-colors duration-200"
                            >
                                Edit
                            </button>
                        </div>
                    </div>

                    {/* Password */}
                    <div className="ep-field flex flex-col gap-2">
                        <label className="pl-1 text-[12px] font-black uppercase tracking-[0.15em] text-white/80">
                            Password
                        </label>
                        <div className="flex items-stretch gap-2">
                            <div className="ep-input flex-1 min-w-0 relative h-13 rounded-2xl overflow-hidden bg-[#0a0a0a]">
                                <Lock className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-neutral-500" />

                                <div className="flex items-center w-full h-full pl-11 pr-3 text-sm font-bold text-white/80 truncate">
                                    ••••••••••
                                </div>
                            </div>
                            
                            <button
                                type="button"
                                onClick={() => setSubModal("password")}
                                className="shrink-0 px-4 self-stretch rounded-2xl text-[12px] font-black uppercase tracking-[0.2em]
                                    border-2 border-white/20 text-white/80
                                    hover:border-neon-pink hover:text-neon-pink hover:cursor-pointer
                                    transition-colors duration-200"
                            >
                                Edit
                            </button>
                        </div>
                    </div>

                    {saveError && (
                        <span className="ep-error text-center text-xs text-red-400 font-bold">{saveError}</span>
                    )}
                </div>

                <footer className="flex items-center justify-center px-5 sxs:px-6 py-4 bg-transparent">
                    <button
                        type="button"
                        onClick={() => {
                            setSaveError(null);
                            saveMutation.mutate(trimmedName);
                        }}
                        disabled={!canSave}
                        className={`flex justify-center items-center gap-2 px-8 py-4 rounded-xl text-[12px] font-black uppercase tracking-[0.18em]
                            bg-neon-pink text-white [text-shadow:1.5px_1.5px_2px_rgba(0,0,0,0.9)] ${canSave ? "shadow-[3px_3px_0px_rgba(255,255,255,1)]" : ""}
                            hover:translate-x-1 hover:translate-y-1 hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]
                            hover:cursor-pointer transition-all duration-300 transform-gpu
                            disabled:opacity-50 disabled:cursor-not-allowed
                            disabled:hover:translate-x-0 disabled:hover:translate-y-0`}
                    >
                        {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saveMutation.isPending ? "Saving" : "Save Changes"}
                    </button>
                </footer>
            </EditProfileModal>

            <AvatarModal
                isOpen={isOpen && subModal === "avatar"}
                onClose={onClose}
                onBack={() => setSubModal("none")}
                avatarUrl={resolveAvatarUrl(currentAvatarUrl, avatarVersion) ?? undefined}
            />
            <UsernameModal
                isOpen={isOpen && subModal === "username"}
                onClose={onClose}
                onBack={() => setSubModal("none")}
            />
            <PasswordModal
                isOpen={isOpen && subModal === "password"}
                onClose={onClose}
                onBack={() => setSubModal("none")}
            />
            <EmailModal
                isOpen={isOpen && subModal === "email"}
                onClose={onClose}
                onBack={() => setSubModal("none")}
            />
        </>
    );
};

export default EditProfile;
