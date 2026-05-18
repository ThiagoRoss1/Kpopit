import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { changePassword } from "../../services/api";
import { getPasswordStrength } from "../../utils/getPasswordStrength";
import EditProfileModal from "./EditProfileModal";
import PasswordInput from "./PasswordInput";

interface PasswordModalProps {
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

const PasswordModal = ({ isOpen, onClose, onBack }: PasswordModalProps) => {
    const { refetchUser } = useAuth();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSaveError(null);
    }, [isOpen]);

    const strength = getPasswordStrength(newPassword);
    const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
    const mismatchHint = confirmPassword.length > 0 && newPassword !== confirmPassword;

    const saveMutation = useMutation({
        mutationFn: () => changePassword(currentPassword, newPassword, confirmPassword),
        onSuccess: async () => {
            await refetchUser();
            onBack();
        },
        onError: (err) => {
            setSaveError(extractError(err) ?? "Could not change password");
        },
    });

    const canSave =
        currentPassword.length > 0
        && newPassword.length >= 8
        && passwordsMatch
        && !saveMutation.isPending;

    return (
        <EditProfileModal
            isOpen={isOpen}
            onClose={onClose}
            title="Change Password"
        >
            <div className="px-5 sxs:px-6 py-5 flex flex-col gap-5">
                <div className="ep-field flex flex-col gap-2">
                    <label className="pl-1 text-[12px] font-black uppercase tracking-[0.15em] text-white/70">
                        Current Password
                    </label>
                    <PasswordInput
                        autoFocus
                        value={currentPassword}
                        onChange={setCurrentPassword}
                        autoComplete="current-password"
                    />
                </div>

                <div className="ep-field flex flex-col gap-2">
                    <label className="pl-1 text-[12px] font-black uppercase tracking-[0.15em] text-white/70">
                        New Password
                    </label>
                    <PasswordInput
                        value={newPassword}
                        onChange={setNewPassword}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                    />
                    {strength && (
                        <div className="px-1">
                            <div className="w-full h-1 overflow-hidden bg-neutral-800 rounded-full">
                                <div
                                    className="ep-strength h-full"
                                    style={{ width: strength.width, backgroundColor: strength.color }}
                                />
                            </div>
                            <p
                                className="mt-1 text-[8px] font-black uppercase tracking-widest"
                                style={{ color: strength.color }}
                            >
                                {strength.label}
                            </p>
                        </div>
                    )}
                </div>

                <div className="ep-field flex flex-col gap-2">
                    <label className="pl-1 text-[12px] font-black uppercase tracking-[0.15em] text-white/70">
                        Confirm New Password
                    </label>
                    <PasswordInput
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        autoComplete="new-password"
                    />
                    {mismatchHint && (
                        <p className="pl-1 text-[11px] font-black uppercase tracking-widest text-red-500">
                            Passwords don't match
                        </p>
                    )}
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
                        className="flex flex-row justify-center items-center px-4 py-2.5 rounded-xl text-sm font-black gap-1
                        border-2 border-white/25 text-white/80
                        hover:border-white hover:text-white hover:bg-white/5
                        hover:cursor-pointer transition-colors duration-300
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

export default PasswordModal;
