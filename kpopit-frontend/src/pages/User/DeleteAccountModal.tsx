import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useAuthUser } from "../../hooks/useAuthUser";
import { requestAccountDeletion } from "../../services/api";
import EditProfileModal from "./EditProfileModal";
import PasswordInput from "./PasswordInput";

const extractError = (err: unknown): string | null => {
    if (typeof err === "object" && err !== null && "response" in err) {
        const r = (err as { response?: { data?: { error?: string } } }).response;
        if (r?.data?.error) return r.data.error;
    }
    return null;
};

/** Schedules the deletion (15-day grace) and signs out: the server already ended every session. */
const DeleteAccountModal = ({ isOpen, onClose, onBack }: { isOpen: boolean; onClose: () => void; onBack: () => void }) => {
    const { refreshAuth } = useAuth();
    const { endLocalSession } = useAuthUser();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const remove = useMutation({
        mutationFn: () => requestAccountDeletion(password),
        onSuccess: async () => {
            endLocalSession();
            await refreshAuth();
            onClose();
            navigate("/", { replace: true });
        },
        onError: (err) => setError(extractError(err) ?? "Could not schedule the deletion"),
    });

    return (
        <EditProfileModal isOpen={isOpen} onClose={onClose} title="Delete Account">
            <div className="px-5 sxs:px-6 py-5 flex flex-col gap-5">
                <div className="ep-field flex flex-col gap-2 text-sm font-bold text-white/80 leading-relaxed">
                    <p className="m-0">Your account will be deleted in 15 days, with your games, stats, collection, Idol XP and profile.</p>
                    <p className="m-0 text-white/60">Changed your mind? Log in again within those 15 days and the deletion is cancelled.</p>
                </div>

                <div className="ep-field flex flex-col gap-2">
                    <label className="pl-1 text-[12px] font-black uppercase tracking-[0.15em] text-white/70">
                        Current Password
                    </label>
                    <PasswordInput autoFocus value={password} onChange={setPassword} autoComplete="current-password" placeholder="Your current password" />
                </div>

                {error && <p className="ep-error text-center text-xs text-red-400 font-bold">{error}</p>}

                <div className="flex flex-col gap-2.5 pt-1">
                    <button
                        type="button"
                        onClick={() => {
                            setError(null);
                            remove.mutate();
                        }}
                        disabled={!password || remove.isPending}
                        className="flex justify-center items-center gap-2 px-8 py-4 rounded-xl text-[12px] font-black uppercase tracking-[0.18em]
                            bg-red-500 text-white [text-shadow:1.5px_1.5px_2px_rgba(0,0,0,0.9)] shadow-[3px_3px_0px_rgba(255,255,255,1)]
                            hover:translate-x-1 hover:translate-y-1 hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]
                            hover:cursor-pointer transition-all duration-300
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                            disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                    >
                        {remove.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {remove.isPending ? "Scheduling" : "Delete in 15 days"}
                    </button>
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={remove.isPending}
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

export default DeleteAccountModal;
