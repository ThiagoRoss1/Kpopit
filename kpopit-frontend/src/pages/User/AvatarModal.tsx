import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, ChevronLeft, Image as ImageIcon, Loader2, Search, Upload } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getIdolsPage, setAvatarFromIdol, uploadAvatarFile } from "../../services/api";
import type { IdolsPageData } from "../../interfaces/gameInterfaces";
import { resolveAvatarUrl } from "../../utils/resolveAvatarUrl";
import { getCroppedImg } from "../../utils/cropImage";
import EditProfileModal from "./EditProfileModal";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const MIN_AVATAR_DIMENSION = 200;

type Tab = "upload" | "idols";

interface AvatarModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBack: () => void;
    avatarUrl?: string;
}

const extractError = (err: unknown): string | null => {
    if (typeof err === "object" && err !== null && "response" in err) {
        const r = (err as { response?: { data?: { error?: string } } }).response;
        if (r?.data?.error) return r.data.error;
    }
    return null;
};

const AvatarModal = ({ isOpen, onClose, onBack, avatarUrl }: AvatarModalProps) => {
    const { refetchUser } = useAuth();

    const [tab, setTab] = useState<Tab>("upload");
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
    const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);
    const [selectedIdolUrl, setSelectedIdolUrl] = useState<string | null>(null);
    const [idolSearch, setIdolSearch] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [hasChosen, setHasChosen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const blobUrlsRef = useRef<Set<string>>(new Set());

    const trackBlobUrl = (url: string) => {
        blobUrlsRef.current.add(url);
        return url;
    };
    const releaseBlobUrl = (url: string | null) => {
        if (!url) return;
        URL.revokeObjectURL(url);
        blobUrlsRef.current.delete(url);
    };

    const { data: idols } = useQuery<IdolsPageData[]>({
        queryKey: ["idolsPageData"],
        queryFn: getIdolsPage,
        staleTime: 1000 * 60 * 60 * 4,
        refetchOnWindowFocus: false,
        enabled: isOpen,
    });

    const filteredIdols = useMemo(() => {
        if (!idols) return [] as IdolsPageData[];
        const q = idolSearch.trim().toLowerCase();
        const published = idols.filter((i) => i.is_published);
        if (!q) return published.slice(0, 60);
        return published.filter(
            (i) =>
                i.artist_name.toLowerCase().includes(q)
                || (i.group_name && i.group_name.toLowerCase().includes(q))
                || (i.all_groups && i.all_groups.toLowerCase().includes(q)),
        );
    }, [idols, idolSearch]);

    // Reset state every time the modal opens; release any tracked blob URLs on close.
    useEffect(() => {
        if (isOpen) {
            setTab("upload");
            setCropSrc(null);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCroppedAreaPixels(null);
            setCroppedBlob(null);
            setCroppedPreviewUrl(null);
            setSelectedIdolUrl(null);
            setIdolSearch("");
            setUploadError(null);
            setSaveError(null);
            setHasChosen(false);
            return;
        }
        const tracked = blobUrlsRef.current;
        tracked.forEach((u) => URL.revokeObjectURL(u));
        tracked.clear();
    }, [isOpen]);

    useEffect(() => {
        const tracked = blobUrlsRef.current;
        return () => {
            tracked.forEach((u) => URL.revokeObjectURL(u));
            tracked.clear();
        };
    }, []);

    const handleFile = useCallback(async (file: File) => {
        setUploadError(null);
        if (!file.type.startsWith("image/")) {
            setUploadError("Please select an image file");
            return;
        }
        if (file.size > MAX_AVATAR_SIZE_BYTES) {
            setUploadError("Image must be under 5MB");
            return;
        }

        const previewUrl = trackBlobUrl(URL.createObjectURL(file));
        const dimensionsOk = await new Promise<boolean>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img.width >= MIN_AVATAR_DIMENSION && img.height >= MIN_AVATAR_DIMENSION);
            img.onerror = () => resolve(false);
            img.src = previewUrl;
        });

        if (!dimensionsOk) {
            releaseBlobUrl(previewUrl);
            setUploadError("Image must be at least 200x200 pixels");
            return;
        }

        setCropSrc((prev) => {
            releaseBlobUrl(prev);
            return previewUrl;
        });
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedBlob(null);
        setSelectedIdolUrl(null);
    }, []);

    const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
        setCroppedAreaPixels(areaPixels);
    }, []);

    const confirmCrop = async () => {
        if (!cropSrc || !croppedAreaPixels) return;
        try {
            const blob = await getCroppedImg(cropSrc, croppedAreaPixels);
            const previewUrl = trackBlobUrl(URL.createObjectURL(blob));
            releaseBlobUrl(croppedPreviewUrl);
            setCroppedBlob(blob);
            setCroppedPreviewUrl(previewUrl);
            releaseBlobUrl(cropSrc);
            setCropSrc(null);
            setCroppedAreaPixels(null);
            setHasChosen(true);
        } catch {
            setUploadError("Could not crop image. Try a different file.");
        }
    };

    const cancelCrop = () => {
        releaseBlobUrl(cropSrc);
        setCropSrc(null);
        setCroppedAreaPixels(null);
        setHasChosen(false);
    };

    const pickIdol = (path: string) => {
        releaseBlobUrl(croppedPreviewUrl);
        setCroppedBlob(null);
        setCroppedPreviewUrl(null);
        setSelectedIdolUrl(path);
        setHasChosen(true);
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (croppedBlob) {
                await uploadAvatarFile(croppedBlob);
            } else if (selectedIdolUrl) {
                await setAvatarFromIdol(selectedIdolUrl);
            }
        },
        onSuccess: async () => {
            await refetchUser();
            onClose();
        },
        onError: (err) => {
            setSaveError(extractError(err) ?? "Could not save avatar");
        },
    });

    const canSave = (!!croppedBlob || !!selectedIdolUrl) && !saveMutation.isPending;

    // Cropper view (full-bleed once the user picks a file)
    if (cropSrc) {
        return (
            <EditProfileModal
                isOpen={isOpen}
                onClose={onClose}
                title="Crop Avatar"
            >
                <div className="px-5 sxs:px-6 py-5 flex flex-col gap-4">
                    <div className="relative w-full aspect-square max-h-90 bg-black rounded-2xl overflow-hidden border-2 border-white/20">
                        <Cropper
                            image={cropSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                        />
                    </div>

                    <div className="flex flex-col gap-1 px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Zoom</span>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full accent-neon-pink"
                        />
                    </div>

                    {uploadError && (
                        <span className="ep-error text-center text-xs text-red-400 font-bold">{uploadError}</span>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={cancelCrop}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-black
                                border-2 border-white/25 text-white/80
                                hover:border-white hover:text-white hover:bg-white/5
                                hover:cursor-pointer transition-colors duration-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmCrop}
                            disabled={!croppedAreaPixels}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-black
                                bg-transparent border-2 border-neon-pink text-white [text-shadow:1.5px_1.5px_2px_rgba(0,0,0,0.9)]
                                hover:bg-neon-pink hover:cursor-pointer transition-all duration-300
                                disabled:opacity-50 disabled:cursor-not-allowed
                                disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                        >
                            Save Photo
                        </button>
                    </div>
                </div>
            </EditProfileModal>
        );
    }

    // Picker view (tabs: upload / idols)
    return (
        <EditProfileModal
            isOpen={isOpen}
            onClose={onClose}
            title="Choose Avatar"
        >
            <div className="px-5 sxs:px-6 py-5 flex flex-col gap-5">
                {/* Preview circle */}
                <div className="flex justify-center">
                    <div
                        className="grid place-items-center w-24 h-24 sxs:w-28 sxs:h-28 rounded-full overflow-hidden
                            border-2 border-neon-pink transform-gpu"
                    >
                        {croppedPreviewUrl ? (
                            <img src={croppedPreviewUrl} alt="Cropped preview" className="w-full h-full object-cover" draggable={false} />
                        ) : selectedIdolUrl ? (
                            <img src={resolveAvatarUrl(selectedIdolUrl) ?? ""} alt="Idol preview" className="w-full h-full object-cover" draggable={false} />
                        ) : (!hasChosen) ? (
                            <img src={avatarUrl} alt="Current avatar" className="w-full h-full object-cover" draggable={false} />
                        ) : (
                            <div className="w-full h-full bg-linear-to-b from-[#2a2a2a] to-[#0e0e0e]" />
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="ep-field relative flex px-1 py-1.5 bg-black/40 border-2 border-white/10 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => setTab("upload")}
                        className={`relative z-10 flex items-center justify-center gap-2 flex-1 h-10 rounded-xl text-sm
                        [text-shadow:1.5px_1.5px_1px_rgba(0,0,0,0.5)] font-black transition-colors duration-200 hover:cursor-pointer
                            ${tab === "upload" ? "text-white" : "text-white/40 hover:text-white/70"}`}
                    >
                        <Upload className="w-3.5 h-3.5" />
                        Upload
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("idols")}
                        className={`relative z-10 flex items-center justify-center gap-2 flex-1 h-10 rounded-xl text-sm
                        [text-shadow:1.5px_1.5px_1px_rgba(0,0,0,0.5)] font-black transition-colors duration-200 hover:cursor-pointer
                            ${tab === "idols" ? "text-white" : "text-white/40 hover:text-white/70"}`}
                    >
                        <ImageIcon className="w-3.5 h-3.5" />
                        KpopIt Idols
                    </button>
                    
                    <div
                        aria-hidden="true"
                        className={`ep-tab-pill absolute top-1 bottom-1 w-[calc(50%-6px)] bg-neon-pink rounded-xl pointer-events-none
                            ${tab === "upload" ? "left-1" : "left-[calc(50%+2px)]"}`}
                    />
                </div>

                {tab === "upload" ? (
                    <div className="ep-field flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const file = e.dataTransfer.files?.[0];
                                if (file) handleFile(file);
                            }}
                            className={`flex flex-col items-center justify-center gap-3 px-5 py-10 rounded-2xl
                                border-2 border-dashed transition-colors duration-200 hover:cursor-pointer
                                ${isDragging
                                    ? "border-neon-pink bg-neon-pink/10"
                                    : "border-white/25 hover:border-neon-pink/70 hover:bg-white/5"}`}
                        >
                            <div className="grid place-items-center w-14 h-14 rounded-full bg-white/15 border-2 border-white/50">
                                <Camera className="w-6 h-6 text-white" />
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <span className="text-base font-black uppercase text-white">
                                    Click or drop image
                                </span>

                                <span className="text-[12px] font-bold text-white/45">
                                    PNG · JPG · WEBP
                                </span>

                                <span className="text-[12px] font-bold text-white/35">
                                    Max 5MB · min 200x200
                                </span>
                            </div>
                        </button>
                        
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFile(file);
                                e.target.value = "";
                            }}
                        />
                        {uploadError && (
                            <span className="ep-error text-center text-xs text-red-400 font-bold">{uploadError}</span>
                        )}
                    </div>
                ) : (
                    <div className="ep-field flex flex-col gap-5">
                        <div className="ep-input relative h-12 rounded-xl overflow-hidden bg-[#0a0a0a]">
                            <Search className="absolute left-3.5 top-1/2 w-4 h-4 -translate-y-1/2 text-neutral-500" />
                            
                            <input
                                type="text"
                                value={idolSearch}
                                onChange={(e) => setIdolSearch(e.target.value)}
                                placeholder="Search for an idol or group..."
                                className="w-full h-full pl-10 pr-4 bg-[#0a0a0a] text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none"
                            />
                        </div>
                        
                        <div className="ep-idol-grid grid grid-cols-3 xm:grid-cols-4 gap-3 sxs:gap-4 max-h-100 overflow-y-auto px-4 rounded-2xl">
                            {filteredIdols.length === 0 && (
                                <span className="col-span-full text-center text-xs text-white/40 font-bold py-8">
                                    No idols found
                                </span>
                            )}
                            {filteredIdols.map((idol) => {
                                const isSelected = selectedIdolUrl === idol.image_path;
                                return (
                                    <button
                                        key={idol.id}
                                        type="button"
                                        onClick={() => pickIdol(idol.image_path)}
                                        className="flex flex-col items-center gap-1.5 hover:cursor-pointer group"
                                    >
                                        <div
                                            className={`relative w-full aspect-square rounded-full overflow-hidden border-2 transition-all duration-300 transform-gpu
                                                ${isSelected
                                                    ? "border-neon-pink shadow-[2px_2px_0px_rgba(255,51,153,1)]"
                                                    : "border-white/25 group-hover:border-neon-pink/70"}`}
                                        >
                                            <img
                                                src={resolveAvatarUrl(idol.image_path) ?? ""}
                                                alt={idol.artist_name}
                                                loading="lazy"
                                                className="w-full h-full object-cover"
                                                draggable={false}
                                            />
                                        </div>
                                        <span className="text-[12px] font-bold text-white/80 truncate w-full text-center">
                                            {idol.artist_name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {saveError && (
                    <span className="ep-error text-center text-xs text-red-400 font-bold">{saveError}</span>
                )}

                {/* Footer buttons */}
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

export default AvatarModal;
