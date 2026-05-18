import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, ChevronLeft, Loader2, User, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { checkUsernameAvailability, updateProfile } from "../../services/api";
import EditProfileModal from "./EditProfileModal";
import PasswordInput from "./PasswordInput";

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const USERNAME_COOLDOWN_DAYS = 5;

type Status = "idle" | "checking" | "available" | "taken";

interface UsernameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBack: () => void;
}

const extractError = (err: unknown): string | null => {
    if (typeof err === "object" && err !== null && "response" in err) {
        const r = (err as { response?: { data?: { error?: string } } }).response;
        if (r?.data?.error) return r.data.error;
    }
    return null;
};

const UsernameModal = ({ isOpen, onClose, onBack }: UsernameModalProps) => {
    const { user, refetchUser } = useAuth();
    const currentUsername = user?.user_credentials?.username ?? "";
    const usernameChangedAt = user?.user_credentials?.username_changed_at ?? null;

    const [username, setUsername] = useState(currentUsername);
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState<Status>("idle");
    const [saveError, setSaveError] = useState<string | null>(null);

    const debounceRef = useRef<number | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const USERNAME_MIN_LENGTH = 3;
    const USERNAME_MAX_LENGTH = 12;

    // Reset every time the modal opens.
    useEffect(() => {
        if (!isOpen) return;
        setUsername(currentUsername);
        setPassword("");
        setStatus("idle");
        setSaveError(null);
    }, [isOpen, currentUsername]);

    const daysLeft = useMemo(() => {
        if (!usernameChangedAt) return 0;
        const daysSince = Math.floor((Date.now() - new Date(usernameChangedAt).getTime()) / 86_400_000);
        return Math.max(0, USERNAME_COOLDOWN_DAYS - daysSince);
    }, [usernameChangedAt]);
    const locked = daysLeft > 0;

    const isValid = username.length >= USERNAME_MIN_LENGTH && username.length <= USERNAME_MAX_LENGTH && USERNAME_REGEX.test(username);
    const unchanged = username === currentUsername;

    // Debounced availability check
    useEffect(() => {
        if (debounceRef.current !== null) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }

        if (!isOpen || !isValid || unchanged) {
            setStatus("idle");
            return;
        }

        setStatus("checking");
        const target = username;

        debounceRef.current = window.setTimeout(() => {
            const controller = new AbortController();
            abortRef.current = controller;
            (async () => {
                try {
                    const res = await checkUsernameAvailability(target, controller.signal);
                    if (controller.signal.aborted) return;
                    setStatus(res.available ? "available" : "taken");
                } catch (err: unknown) {
                    const e = err as { code?: string; name?: string };
                    if (e?.code === "ERR_CANCELED" || e?.name === "AbortError") return;
                    setStatus("idle");
                }
            })();
        }, 400);

        return () => {
            if (debounceRef.current !== null) {
                clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
        };
    }, [username, isOpen, isValid, unchanged]);

    const saveMutation = useMutation({
        mutationFn: () => updateProfile({ username, current_password: password }),
        onSuccess: async () => {
            await refetchUser();
            onBack();
        },
        onError: (err) => {
            setSaveError(extractError(err) ?? "Could not update username");
        },
    });

    const canSave =
        !locked
        && isValid
        && !unchanged
        && status === "available"
        && password.length > 0
        && !saveMutation.isPending;

    return (
        <EditProfileModal
            isOpen={isOpen}
            onClose={onClose}
            title="Change Username"
        >
            <div className="px-5 sxs:px-6 py-5 flex flex-col gap-5">
                <div className="ep-field flex flex-col gap-2">
                    <label className="pl-1 text-[12px] font-black uppercase tracking-[0.15em] text-white/70">
                        New Username
                    </label>

                    <div className="ep-input relative h-13 rounded-2xl overflow-hidden bg-[#0a0a0a]">
                        <User className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-white" />
                        
                        <input
                            autoFocus
                            type="text"
                            value={username}
                            maxLength={USERNAME_MAX_LENGTH}
                            disabled={locked}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="@your-new-handle"
                            className="w-full h-full pl-11 pr-12 bg-[#0a0a0a] text-sm font-bold text-white placeholder:text-neutral-700 focus:outline-none disabled:opacity-50"
                        />
                        {!unchanged && isValid && status === "checking" && (
                            <Loader2 className="absolute right-4 top-1/2 w-4 h-4 -translate-y-1/2 text-neutral-400 animate-spin" />
                        )}
                        {!unchanged && isValid && status === "available" && (
                            <Check className="absolute right-4 top-1/2 w-4 h-4 -translate-y-1/2 text-green-500" />
                        )}
                        {!unchanged && isValid && status === "taken" && (
                            <X className="absolute right-4 top-1/2 w-4 h-4 -translate-y-1/2 text-red-500" />
                        )}
                    </div>

                    {locked && (
                        <span className="pl-1 text-[12px] font-black uppercase tracking-widest text-neon-pink/80">
                            Next change in {daysLeft} day{daysLeft === 1 ? "" : "s"}
                        </span>
                    )}
                    {!locked && status === "taken" && (
                        <span className="pl-1 text-[12px] font-black uppercase tracking-widest text-red-500">
                            Username already taken
                        </span>
                    )}
                    {!locked && username.length > 0 && !isValid && (
                        <span className="pl-1 text-[12px] font-black uppercase tracking-widest text-red-500">
                            {USERNAME_MIN_LENGTH} - {USERNAME_MAX_LENGTH} letters, numbers, _ or -
                        </span>
                    )}
                </div>

                <div className="ep-field flex flex-col gap-2">
                    <label className="pl-1 text-[12px] font-black uppercase tracking-[0.15em] text-white/70">
                        Confirm Password
                    </label>
                    
                    <PasswordInput
                        value={password}
                        onChange={setPassword}
                        autoComplete="current-password"
                        placeholder="Your current password"
                    />
                </div>

                {saveError && (
                    <p className="ep-error text-center text-xs text-red-400 font-bold">{saveError}</p>
                )}

                <div className="flex flex-col gap-2.5 pt-1">
                    <button
                        type="button"
                        onClick={() => {
                            setSaveError(null);
                            saveMutation.mutate();
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

                    <button
                        type="button"
                        onClick={onBack}
                        disabled={saveMutation.isPending}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-[0.2em]
                            border-2 border-white/15 text-white/60
                            hover:border-white/40 hover:text-white hover:cursor-pointer transition-colors
                            disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Return
                    </button>
                </div>
            </div>
        </EditProfileModal>
    );
};

export default UsernameModal;
