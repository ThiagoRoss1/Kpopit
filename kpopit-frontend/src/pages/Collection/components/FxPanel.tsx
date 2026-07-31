import { useEffect, useRef, useState, type AnimationEvent } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useCollectionFx } from '../useCollectionFx';
import type { FxKey } from '../collectionFx';

interface FxPanelProps {
    night: boolean;
    onClose: () => void;
    albumName?: string;
    closing: boolean;
    /** From useDisclosure's animationProps — it owns the unmount and the bubbling guard. */
    onAnimationEnd: (event: AnimationEvent<Element>) => void;
}

interface RowSpec {
    key: FxKey;
    label: string;
    hint?: string;
}

const TEXTURE_ROWS: RowSpec[] = [
    { key: 'backdrop', label: 'Background paper' },
    { key: 'textures', label: 'Album textures' },
    { key: 'shadows', label: 'Shadows' },
    { key: 'blur', label: 'Toolbar blur' },
];

const MOTION_ROWS: RowSpec[] = [
    { key: 'sparkles', label: 'Background sparkles' },
    { key: 'lv2', label: 'Gold shine (LV2)' },
    { key: 'lv3', label: 'Holographic (LV3)' },
];

const CONTROL_ROWS: RowSpec[] = [
    {
        key: 'tapZoom',
        label: 'Tap to zoom stickers',
        hint: 'Turn this off to use the whole page for turning.',
    },
];

function FxSwitch({
    checked, onChange, night, label, hint, strong = false,
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    night: boolean;
    label: string;
    hint?: string;
    strong?: boolean;
}) {
    const track = checked
        ? night ? 'border-neon-pink bg-ink/20' : 'border-ink bg-neon-pink'
        : night ? 'border-white/25 bg-transparent' : 'border-ink/35 bg-transparent';
    const knob = checked
        ? night
            ? 'bg-neon-pink'
            : 'bg-white'
        : night
            ? 'bg-white/30'
            : 'bg-ink/30';

    return (
        <>
            {/* Switch button */}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-left 
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-pink"
            >
                {/* Label and hint */}
                <span className="min-w-0 flex-1">
                    <span
                        className={`block font-sans text-[13.5px] ${strong ? 'font-bold' : 'font-semibold'} ${
                            night ? 'text-white' : 'text-[#3c2f38]'
                        }`}
                    >
                        {label}
                    </span>
                    {hint && (
                        <span className={`mt-0.5 block font-sans text-[11px] leading-[1.4] ${night ? 'text-white/55' : 'text-[#7a6b74]'}`}>
                            {hint}
                        </span>
                    )}
                </span>

                {/* Switch track and knob */}
                <span className={`flex h-6 w-12 flex-none items-center rounded-full border-2 p-0.5 transition-colors duration-300 ${track}`}>
                    <span
                        className={`size-4 rounded-full transition-transform duration-300 ${knob} ${
                            checked ? 'translate-x-6 scale-100' : 'translate-x-0 scale-90' // animation to-do
                        }`}
                    />
                </span>
            </button>
        </>
    );
}

function FxGroup({
    title, rows, open, onToggleOpen, masterOn, onMaster, fx, setFx, night
}: {
    title: string;
    rows: RowSpec[];
    open: boolean;
    onToggleOpen: () => void;
    masterOn: boolean;
    onMaster: (next: boolean) => void;
    fx: Record<FxKey, boolean>;
    setFx: (key: FxKey, value: boolean) => void;
    night: boolean;
}) {
    return (
        <section className={`rounded-2xl border-2 p-3 ${night ? 'border-white/12' : 'border-ink/15'}`}>
            <div className="flex items-center gap-2">
                {/* Group toggle */}
                <button
                    type="button"
                    onClick={onToggleOpen}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-lg text-left text-[12px] font-bold
                    uppercase tracking-[0.06em] focus-visible:outline-2 focus-visible:outline-offset-2 
                    focus-visible:outline-neon-pink text-neon-pink [text-shadow:1px_1px_0px_rgba(0,0,0,1)]"
                >
                    <ChevronDown className={`w-4 h-4 flex-none transition-transform duration-300 ${open ? 'rotate-0' : '-rotate-180'}`} strokeWidth={3} />
                    <span className="truncate">{title}</span>
                </button>
                
                {/* Master toggle */}
                <button
                    type="button"
                    role="switch"
                    aria-checked={masterOn}
                    aria-label={`${title} — all`}
                    onClick={() => onMaster(!masterOn)}
                    className={`flex h-6 w-12 flex-none cursor-pointer items-center rounded-full border-2 p-0.5 
                    transition-colors duration-300 mr-1 ${
                        masterOn
                            ? night ? 'border-neon-pink bg-ink/20' : 'border-ink bg-neon-pink'
                            : night ? 'border-white/25' : 'border-ink/35'
                    }`}
                >
                    {/* Master toggle knob */}
                    <span
                        className={`flex w-4 h-4 rounded-full transition-transform duration-300 focus-visible:outline-2 
                            focus-visible:outline-offset-2 focus-visible:outline-neon-pink ${
                            masterOn
                                ? night ? 'translate-x-6 bg-neon-pink scale-100' : 'translate-x-6 bg-white scale-100'
                                : night ? 'bg-white/30 scale-90' : 'bg-ink/30 scale-90'
                        }`}
                    />
                </button>
            </div>

            {open && (
                <div className={`mt-1.5 border-t pt-1 ${night ? 'border-white/10' : 'border-ink/10'}`}>
                    {rows.map((row) => (
                        <FxSwitch
                            key={row.key}
                            checked={fx[row.key]}
                            onChange={(next) => setFx(row.key, next)}
                            night={night}
                            label={row.label}
                            hint={row.hint}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

export default function FxPanel({ night, onClose, albumName, closing, onAnimationEnd }: FxPanelProps) {
    const { fx, setFx, setFxGroup, groupOn } = useCollectionFx();
    const panelRef = useRef<HTMLDivElement>(null);

    const wide = typeof matchMedia === 'function' && matchMedia('(min-width: 1024px)').matches;
    const [openGroups, setOpenGroups] = useState({ texture: wide, motion: wide, controls: wide });

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Element;

            if (target.closest('#fx-panel-toggle')) return;
            
            if (!panelRef.current?.contains(event.target as Node)) onClose();
        };
        
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onPointerDown);

        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, [onClose]);

    const shell = night
        ? 'border-neon-pink bg-[#16181e] shadow-[6px_6px_0px_rgba(255,51,153,1)]'
        : 'border-ink bg-[#fffaf3] shadow-[6px_6px_0px_#0a0a0a]';

    const motionClass = closing
        ? 'collection-sheet-out lg:collection-pop-out'
        : 'collection-sheet-in lg:collection-pop-in';

    const backdropMotion = closing ? 'collection-backdrop-out' : 'collection-backdrop-in';

    return (
        <>
            {/* Phone */}
            <div className={`fixed inset-0 z-250 bg-[#1e141c]/55 lg:hidden ${backdropMotion}`} aria-hidden />

            <div
                ref={panelRef}
                role="dialog"
                aria-label="Visual effects"
                onAnimationEnd={onAnimationEnd}
                className={`fixed inset-x-0 bottom-0 z-260 max-h-[80dvh] overflow-y-auto rounded-t-[20px] border-2 p-4 text-left transition-colors duration-300
                    lg:absolute lg:inset-x-auto lg:bottom-auto lg:right-3 lg:top-full lg:mt-4 lg:w-64 lg:rounded-[20px] lg:p-3 ${motionClass} ${shell}`}
            >
                <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                        <p className={`text-[10px] uppercase font-bold tracking-[0.20em] ${night ? 'text-neon-pink' : 'text-[#C62368]'}`}>
                            Visual effects
                        </p>
                        
                        <p className={`font-major-mono-display mt-0.75 sm:text-2xl text-xl uppercase 
                            tracking-[0.02em] ${night ? 'text-white' : 'text-ink'}`}>
                            {albumName}
                        </p>
                    </div>
                    
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className={`flex size-8 flex-none cursor-pointer items-center justify-center rounded-full border-2 
                            bg-transparent transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 lg:hidden ${
                            night
                                ? 'border-neon-pink text-white shadow-[2px_2px_0px_rgba(255,51,153,1)] active:shadow-none'
                                : 'border-ink text-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] active:shadow-none'
                        }`}
                    >
                        <X className="w-4 h-4" strokeWidth={3} />
                    </button>
                </div>

                <div className="mt-3.5 flex flex-col gap-2.5">
                    <FxGroup
                        title="Texture & depth"
                        rows={TEXTURE_ROWS}
                        open={openGroups.texture}
                        onToggleOpen={() => setOpenGroups((previous) => ({ ...previous, texture: !previous.texture }))}
                        masterOn={groupOn('texture')}
                        onMaster={(next) => setFxGroup('texture', next)}
                        fx={fx}
                        setFx={setFx}
                        night={night}
                    />
                    <FxGroup
                        title="Animation"
                        rows={MOTION_ROWS}
                        open={openGroups.motion}
                        onToggleOpen={() => setOpenGroups((previous) => ({ ...previous, motion: !previous.motion }))}
                        masterOn={groupOn('motion')}
                        onMaster={(next) => setFxGroup('motion', next)}
                        fx={fx}
                        setFx={setFx}
                        night={night}
                    />
                    <FxGroup
                        title="Controls"
                        rows={CONTROL_ROWS}
                        open={openGroups.controls}
                        onToggleOpen={() => setOpenGroups((previous) => ({ ...previous, controls: !previous.controls }))}
                        masterOn={groupOn('controls')}
                        onMaster={(next) => setFxGroup('controls', next)}
                        fx={fx}
                        setFx={setFx}
                        night={night}
                    />
                </div>

                <p className={`mt-3 font-sans text-[11.5px] leading-[1.45] ${night ? 'text-white/55' : 'text-[#7a6b74]'}`}>
                    Turning effects off makes the album lighter on slower devices.
                </p>
            </div>
        </>
    );
}
