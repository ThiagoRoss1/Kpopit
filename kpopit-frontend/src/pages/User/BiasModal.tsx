import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, ChevronLeft, Loader2, Search } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { updateProfileSettings } from "../../services/api";
import EditProfileModal from "./EditProfileModal";
import { useBiasOptions } from "./biasOptions";

const extractError = (err: unknown): string | null => {
    if (typeof err === "object" && err !== null && "response" in err) {
        const r = (err as { response?: { data?: { error?: string } } }).response;
        if (r?.data?.error) return r.data.error;
    }
    return null;
};

const BiasModal = ({ kind, isOpen, onClose, onBack }: { kind: "idol" | "group"; isOpen: boolean; onClose: () => void; onBack: () => void }) => {
    const { user, refetchUser } = useAuth();
    const options = useBiasOptions(isOpen);
    const field = kind === "idol" ? "bias_idol_id" : "bias_group_id";
    const current = user?.profile[field] ?? null;
    const [search, setSearch] = useState("");
    const [error, setError] = useState<string | null>(null);

    const save = useMutation({
        mutationFn: (id: number | null) => updateProfileSettings({ [field]: id }),
        onSuccess: async () => {
            await refetchUser();
            onBack();
        },
        onError: (err) => setError(extractError(err) ?? "Could not save your bias"),
    });

    const list = kind === "idol" ? options.idols : options.groups;
    const q = search.trim().toLowerCase();
    const shown = (q ? list.filter((o) => `${o.name} ${o.sub ?? ""}`.toLowerCase().includes(q)) : list).slice(0, 60);
    const noun = kind === "idol" ? "idol" : "group";

    return (
        <EditProfileModal isOpen={isOpen} onClose={onClose} title={kind === "idol" ? "Bias Idol" : "Bias Group"}>
            <div className="px-5 sxs:px-6 py-5 flex flex-col gap-4">
                <div className="ep-input relative h-13 rounded-2xl overflow-hidden bg-ink">
                    <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white" />
                    <input
                        autoFocus
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={`Search a ${noun}...`}
                        aria-label={`Search a ${noun}`}
                        className="size-full pl-11 pr-4 bg-ink text-sm font-bold text-white placeholder:text-neutral-700 focus:outline-none"
                    />
                </div>

                <div role="listbox" aria-label={`Pick your bias ${noun}`} className="ep-field flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
                    {!options.loaded && <Loader2 className="self-center my-6 size-5 text-white/60 animate-spin" />}
                    {shown.map((option) => {
                        const selected = option.id === current;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                disabled={save.isPending}
                                onClick={() => save.mutate(option.id)}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl border-2 text-left transition-colors duration-200 hover:cursor-pointer
                                    disabled:opacity-60 disabled:cursor-not-allowed
                                    ${selected ? "border-neon-pink bg-neon-pink/10" : "border-white/10 hover:border-white/40"}`}
                            >
                                {kind === "idol" && (
                                    <span className="size-9 shrink-0 rounded-lg overflow-hidden bg-[#1a1a1a]">
                                        {option.image && <img src={option.image} alt="" loading="lazy" className="size-full object-cover" />}
                                    </span>
                                )}
                                <span className="flex flex-col min-w-0 flex-1">
                                    <span className="text-sm font-black text-white truncate">{option.name}</span>
                                    {option.sub && <span className="text-xs font-bold text-white/50 truncate">{option.sub}</span>}
                                </span>
                                {selected && <Check className="size-4 text-neon-pink shrink-0" />}
                            </button>
                        );
                    })}
                    {options.loaded && !shown.length && (
                        <span className="py-4 text-center text-sm font-bold text-white/50">No {noun} matches "{search}"</span>
                    )}
                </div>

                {error && <p className="ep-error text-center text-xs text-red-400 font-bold">{error}</p>}

                <div className="flex flex-col gap-2.5 pt-1">
                    {current !== null && (
                        <button
                            type="button"
                            onClick={() => save.mutate(null)}
                            disabled={save.isPending}
                            className="px-4 py-2.5 rounded-xl text-sm font-black border-2 border-white/25 text-white/80
                                hover:border-neon-pink hover:text-neon-pink hover:cursor-pointer transition-colors duration-300
                                disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Clear bias {noun}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={save.isPending}
                        className="flex flex-row justify-center items-center px-4 py-2.5 rounded-xl text-sm font-black gap-1
                        border-2 border-white/25 text-white/80
                        hover:border-white hover:text-white hover:bg-white/5
                        hover:cursor-pointer transition-colors duration-300
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="size-5" />
                        Return
                    </button>
                </div>
            </div>
        </EditProfileModal>
    );
};

export default BiasModal;
