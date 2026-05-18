import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, Loader2, Mail } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { requestEmailChange } from "../../services/api";
import EditProfileModal from "./EditProfileModal";
import PasswordInput from "./PasswordInput";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;

interface EmailModalProps {
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

const EmailModal = ({ isOpen, onClose, onBack }: EmailModalProps) => {
    const { user } = useAuth();
    const currentEmail = user?.user_credentials?.email ?? "";

    const [newEmail, setNewEmail] = useState("");
    const [password, setPassword] = useState("");
    const [saveError, setSaveError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setNewEmail("");
        setPassword("");
        setSaveError(null);
        setSent(false);
    }, [isOpen]);

    const trimmed = newEmail.trim();
    const isValid = EMAIL_REGEX.test(trimmed) && trimmed.length <= EMAIL_MAX_LENGTH;
    const unchanged = trimmed.toLowerCase() === currentEmail.toLowerCase();

    const saveMutation = useMutation({
        mutationFn: () => requestEmailChange(trimmed, password),
        onSuccess: () => setSent(true),
        onError: (err) => {
            setSaveError(extractError(err) ?? "Could not send confirmation email");
        },
    });

    const canSave =
        isValid
        && !unchanged
        && password.length > 0
        && !saveMutation.isPending
        && !sent;

    return (
        <EditProfileModal
            isOpen={isOpen}
            onClose={onClose}
            title="Change Email"
        >
            <div className="px-5 sxs:px-6 py-5 flex flex-col gap-5">
                <div className="ep-field flex flex-col gap-2">
                    <label className="pl-1 text-[12px] font-black uppercase tracking-[0.15em] text-white/70">
                        New Email
                    </label>

                    <div className="ep-input relative h-13 rounded-2xl overflow-hidden bg-[#0a0a0a]">
                        <Mail className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-white" />

                        <input
                            autoFocus
                            type="email"
                            value={newEmail}
                            maxLength={EMAIL_MAX_LENGTH}
                            disabled={sent}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full h-full pl-11 pr-4 bg-[#0a0a0a] text-sm font-bold text-white placeholder:text-neutral-700 focus:outline-none disabled:opacity-50"
                        />
                    </div>

                    {newEmail.length > 0 && !isValid && (
                        <span className="pl-1 text-[12px] font-black uppercase tracking-widest text-red-500">
                            Invalid email format
                        </span>
                    )}
                    {isValid && unchanged && (
                        <span className="pl-1 text-[12px] font-black uppercase tracking-widest text-red-500">
                            That's your current email
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

                {sent && (
                    <p className="ep-error text-center text-xs text-neon-pink font-bold">
                        Confirmation link sent to {trimmed}. Open it within 24 hours to finish the change.
                    </p>
                )}

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
                        {saveMutation.isPending ? "Sending" : sent ? "Sent" : "Send Confirmation"}
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

export default EmailModal;
