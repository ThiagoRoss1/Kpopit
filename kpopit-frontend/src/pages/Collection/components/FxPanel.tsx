import {
    useEffect,
    useRef,
    useState,
    type AnimationEvent,
    type KeyboardEvent as ReactKeyboardEvent,
    type ReactNode,
} from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useCollectionFx } from '../useCollectionFx';
import { getRadioNavigationIndex } from './radioNavigation';
import GraphicsWarningModal from './GraphicsWarningModal';
import {
    hasHeavyGraphicsWarned,
    isHeavyGfx,
    isHeavyPreset,
    markHeavyGraphicsWarned,
    type PendingHeavyAction,
} from '../graphicsWarning';
import type {
    AlbumTextureGraphics,
    CardGraphics,
    GfxKey,
    GfxPreset,
    GfxSettings,
    SelectableGfxPreset,
} from '../collectionFx';

interface FxPanelProps {
    night: boolean;
    onClose: () => void;
    albumName?: string;
    closing: boolean;
    /** From useDisclosure's animationProps — it owns unmounting and bubbling. */
    onAnimationEnd: (event: AnimationEvent<Element>) => void;
}

interface SwitchSpec {
    key: 'sparkles' | 'goldShine' | 'holoShine' | 'tapZoom' | 'arrows';
    label: string;
    hint?: string;
}

const PRESET_OPTIONS: readonly { key: GfxPreset; label: string }[] = [
    { key: 'auto', label: 'Auto' },
    { key: 'high', label: 'High' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low' },
    { key: 'custom', label: 'Custom' },
];
const PRESET_ENABLED = PRESET_OPTIONS.map((option) => option.key !== 'custom');

const CARD_OPTIONS: readonly { value: CardGraphics; label: string }[] = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
    { value: 'border', label: 'Border' },
];

const TEXTURE_OPTIONS: readonly { value: AlbumTextureGraphics; label: string }[] = [
    { value: 'high', label: 'High' },
    { value: 'low', label: 'Low' },
    { value: 'off', label: 'Off' },
];

const BOOLEAN_OPTIONS: readonly { value: boolean; label: string }[] = [
    { value: true, label: 'On' },
    { value: false, label: 'Off' },
];

const ANIMATION_ROWS: readonly SwitchSpec[] = [
    { key: 'sparkles', label: 'Background sparkles' },
    { key: 'goldShine', label: 'Gold shine (LV2)' },
    { key: 'holoShine', label: 'Holo shine (LV3)' },
];

const CONTROL_ROWS: readonly SwitchSpec[] = [
    {
        key: 'tapZoom',
        label: 'Tap to zoom stickers',
        hint: 'Off uses the whole page for turning instead.',
    },
    {
        key: 'arrows',
        label: 'Side page arrows',
        hint: 'Off for a cleaner view; turn by tap, keyboard, or the carousel.',
    },
];

function FxSwitch({
    checked,
    onChange,
    night,
    label,
    hint,
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    night: boolean;
    label: string;
    hint?: string;
}) {
    const track = checked
        ? night ? 'border-neon-pink bg-ink/20' : 'border-ink bg-neon-pink'
        : night ? 'border-white/25 bg-transparent' : 'border-ink/35 bg-transparent';
    const knob = checked
        ? night ? 'bg-neon-pink' : 'bg-white'
        : night ? 'bg-white/30' : 'bg-ink/30';

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-left focus-visible:outline-2 
            focus-visible:outline-offset-2 focus-visible:outline-neon-pink"
        >
            <span className="min-w-0 flex-1">
                <span className={`block font-sans text-[13.5px] font-semibold ${night ? 'text-white' : 'text-[#3c2f38]'}`}>
                    {label}
                </span>
                {hint && (
                    <span className={`mt-0.5 block font-sans text-[11px] leading-[1.4] ${night ? 'text-white/55' : 'text-[#7a6b74]'}`}>
                        {hint}
                    </span>
                )}
            </span>
            <span className={`flex h-6 w-12 flex-none items-center rounded-full border-2 p-0.5 transition-colors duration-300 ${track}`}>
                <span className={`size-4 rounded-full transition-transform duration-300 ${knob} ${checked ? 'translate-x-6 scale-100' : 'translate-x-0 scale-90'}`} />
            </span>
        </button>
    );
}

function SegmentedSlider<T extends string | boolean> ({
    label,
    value,
    options,
    onChange,
    night,
}: {
    label: string;
    value: T;
    options: readonly { value: T; label: string }[];
    onChange: (next: T) => void;
    night: boolean;
}) {
    const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const enabled = options.map(() => true);
    const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
        const nextIndex = getRadioNavigationIndex(currentIndex, event.key, enabled);
        if (nextIndex === null) return;

        const nextOption = options[nextIndex];
        if (!nextOption) return;

        event.preventDefault();
        onChange(nextOption.value);
        buttonRefs.current[nextIndex]?.focus();
    };

    return (
        <div className="px-1 py-1.5">
            <p className={`font-sans text-[12.5px] font-semibold ${night ? 'text-white' : 'text-[#3c2f38]'}`}>
                {label}
            </p>

            <div
                role="radiogroup"
                aria-label={label}
                className="mt-1.5 grid gap-1"
                style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
            >
                {options.map((option, index) => {
                    const active = value === option.value;
                    return (
                        <button
                            key={String(option.value)}
                            ref={(node) => {
                                buttonRefs.current[index] = node;
                            }}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            tabIndex={active ? 0 : -1}
                            onKeyDown={(event) => onKeyDown(event, index)}
                            onClick={() => onChange(option.value)}
                            className={`h-8 min-w-0 cursor-pointer whitespace-nowrap rounded-xl border-2 px-1 text-center text-[10px] font-bold uppercase 
                            transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-pink ${
                                active
                                    ? night
                                        ? 'border-neon-pink bg-neon-pink text-white'
                                        : 'border-ink bg-neon-pink text-white'
                                    : night
                                        ? 'border-white/25 text-white/70'
                                        : 'border-ink/30 text-[#3c2f38]'
                            }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function FxGroup({
    title,
    open,
    onToggle,
    night,
    children,
}: {
    title: string;
    open: boolean;
    onToggle: () => void;
    night: boolean;
    children: ReactNode;
}) {
    return (
        <section className={`rounded-2xl border-2 p-3 ${night ? 'border-white/12' : 'border-ink/15'}`}>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg text-left text-[12px] font-bold uppercase tracking-[0.06em] 
                text-neon-pink [text-shadow:1px_1px_0px_rgba(0,0,0,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-pink"
            >
                <ChevronDown className={`size-4 flex-none transition-transform duration-300 ${open ? 'rotate-0' : '-rotate-180'}`} strokeWidth={3} />
                <span>{title}</span>
            </button>
            {open && (
                <div className={`mt-1.5 border-t pt-1 ${night ? 'border-white/10' : 'border-ink/10'}`}>
                    {children}
                </div>
            )}
        </section>
    );
}

function PresetGrid({
    preset,
    deviceTier,
    setPreset,
    night,
}: {
    preset: GfxPreset;
    deviceTier: 'high' | 'medium' | 'low';
    setPreset: (next: SelectableGfxPreset) => void;
    night: boolean;
}) {
    const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const selectedIndex = PRESET_OPTIONS.findIndex((option) => option.key === preset);
    const tabbableIndex = selectedIndex >= 0 && PRESET_ENABLED[selectedIndex]
        ? selectedIndex
        : PRESET_ENABLED.findIndex(Boolean);

    const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
        const nextIndex = getRadioNavigationIndex(currentIndex, event.key, PRESET_ENABLED);
        if (nextIndex === null) return;

        const nextOption = PRESET_OPTIONS[nextIndex];
        if (!nextOption || nextOption.key === 'custom') return;

        event.preventDefault();
        setPreset(nextOption.key);
        buttonRefs.current[nextIndex]?.focus();
    };

    return (
        <div className={`rounded-2xl border-2 p-3 ${night ? 'border-white/12' : 'border-ink/15'}`}>
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-neon-pink [text-shadow:1px_1px_0px_rgba(0,0,0,1)]">
                Preset
            </p>
            <div role="radiogroup" aria-label="Graphics preset" className="mt-2 grid grid-cols-2 gap-1.5">
                {PRESET_OPTIONS.map((option, index) => {
                    const presetKey = option.key;
                    const active = preset === presetKey;
                    
                    const activeClass = night
                        ? 'border-neon-pink bg-neon-pink text-white'
                        : 'border-ink bg-neon-pink text-white';
                        
                    const idleClass = night
                        ? 'border-white/25 text-white/70'
                        : 'border-ink/30 text-[#3c2f38]';

                    const shared = `h-9 min-w-0 w-full whitespace-nowrap rounded-xl border-2 px-2 text-center text-[12px] font-bold uppercase transition-colors ${
                        active ? activeClass : idleClass
                    }`;

                    if (presetKey === 'custom') {
                        return (
                            <button
                                key={presetKey}
                                ref={(node) => {
                                    buttonRefs.current[index] = node;
                                }}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                aria-disabled="true"
                                disabled
                                tabIndex={-1}
                                className={`flex cursor-default items-center justify-center select-none ${shared} ${active ? '' : 'opacity-55'}`}
                            >
                                Custom
                            </button>
                        );
                    }

                    return (
                        <button
                            key={presetKey}
                            ref={(node) => {
                                buttonRefs.current[index] = node;
                            }}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            tabIndex={index === tabbableIndex ? 0 : -1}
                            onKeyDown={(event) => onKeyDown(event, index)}
                            onClick={() => setPreset(presetKey)}
                            className={`cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-pink ${shared}`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
            <p className={`mt-2 min-h-[2.8em] font-sans text-[11px] leading-[1.4] ${night ? 'text-white/55' : 'text-[#7a6b74]'}`}>
                Auto follows your device at <span className="font-bold capitalize">{deviceTier}</span>.
            </p>
        </div>
    );
}

export default function FxPanel({ night, onClose, albumName, closing, onAnimationEnd }: FxPanelProps) {
    const { settings, preset, deviceTier, setGfx, setPreset } = useCollectionFx();
    const panelRef = useRef<HTMLDivElement>(null);
    const wide = typeof matchMedia === 'function' && matchMedia('(min-width: 1024px)').matches;
    const [openGroups, setOpenGroups] = useState({ graphics: true, animation: wide, controls: wide });
    const [pendingHeavy, setPendingHeavy] = useState<PendingHeavyAction | null>(null);

    const pendingRef = useRef(false);
    pendingRef.current = pendingHeavy !== null;

    // On a device Auto-resolved to Low, intercept the first heavy graphics change
    // (High preset / full-res textures / holo shimmer) with a one-time confirm.

    const shouldWarn = deviceTier === 'low' && !hasHeavyGraphicsWarned();

    const guardedSetPreset = (next: SelectableGfxPreset) => {
        if (shouldWarn && isHeavyPreset(next)) {
            setPendingHeavy({ kind: 'preset', value: next });
            return;
        }
        setPreset(next);
    };

    const guardedSetGfx = <K extends GfxKey>(key: K, value: GfxSettings[K]) => {
        if (shouldWarn && isHeavyGfx(key, value)) {
            setPendingHeavy({ kind: 'gfx', key, value });
            return;
        }
        setGfx(key, value);
    };

    const confirmHeavy = () => {
        if (!pendingHeavy) return;

        markHeavyGraphicsWarned();

        if (pendingHeavy.kind === 'preset') setPreset(pendingHeavy.value);
        else setGfx(pendingHeavy.key, pendingHeavy.value);

        setPendingHeavy(null);
    };

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (pendingRef.current) {
                    setPendingHeavy(null);
                    return;
                }
                onClose();
            }
        };
        const onPointerDown = (event: PointerEvent) => {
            if (pendingRef.current) return;

            if (!(event.target instanceof Element)) return;
            const target = event.target;

            if (target.closest('#fx-panel-toggle')) return;
            if (!panelRef.current?.contains(target)) onClose();
        };

        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onPointerDown);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, [onClose]);

    const setBoolean = (key: SwitchSpec['key'], value: boolean) => {
        guardedSetGfx(key, value);
    };
    const toggleGroup = (key: keyof typeof openGroups) => {
        setOpenGroups((previous) => ({ ...previous, [key]: !previous[key] }));
    };
    const shell = night
        ? 'border-neon-pink bg-[#16181e] shadow-[6px_6px_0px_rgba(255,51,153,1)]'
        : 'border-ink bg-[#fffaf3] shadow-[6px_6px_0px_#0a0a0a]';
    const motionClass = closing
        ? 'collection-sheet-out lg:collection-pop-out'
        : 'collection-sheet-in lg:collection-pop-in';
    const backdropMotion = closing ? 'collection-backdrop-out' : 'collection-backdrop-in';

    return (
        <>
            <div className={`fixed inset-0 z-250 bg-[#1e141c]/55 lg:hidden ${backdropMotion}`} aria-hidden />
            <div
                ref={panelRef}
                role="dialog"
                aria-label="Visual effects"
                onAnimationEnd={onAnimationEnd}
                className={`fixed inset-x-0 bottom-0 z-260 flex max-h-[80dvh] flex-col overflow-hidden rounded-t-[20px] border-2 p-4 
                text-left transition-colors duration-300 lg:absolute lg:inset-x-auto lg:bottom-auto lg:right-3 lg:top-full lg:mt-4 lg:max-h-[min(80dvh,44rem)] 
                lg:w-72 lg:rounded-[20px] lg:p-3 ${motionClass} ${shell}`}
            >
                <div className="flex flex-none items-start justify-between gap-2.5">
                    <div className="min-w-0">
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${night ? 'text-neon-pink' : 'text-[#C62368]'}`}>
                            Visual effects
                        </p>
                        <p className={`font-major-mono-display mt-0.75 text-xl uppercase tracking-[0.02em] sm:text-2xl ${night ? 'text-white' : 'text-ink'}`}>
                            {albumName}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className={`flex size-8 flex-none cursor-pointer items-center justify-center rounded-full border-2 bg-transparent 
                        transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 lg:hidden ${
                            night
                                ? 'border-neon-pink text-white shadow-[2px_2px_0px_rgba(255,51,153,1)] active:shadow-none'
                                : 'border-ink text-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] active:shadow-none'
                        }`}
                    >
                        <X className="w-4 h-4" strokeWidth={3} />
                    </button>
                </div>

                <div className={`album-index-scroll mt-3.5 -mx-2 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-2 pb-1 contain-[paint] ${night ? 'album-index-scroll--night' : ''}`}>
                    <PresetGrid preset={preset} deviceTier={deviceTier} setPreset={guardedSetPreset} night={night} />

                    <FxGroup title="Graphics" open={openGroups.graphics} onToggle={() => toggleGroup('graphics')} night={night}>
                        <SegmentedSlider label="Card treatment" value={settings.cards} options={CARD_OPTIONS} onChange={(value) => guardedSetGfx('cards', value)} night={night} />
                        <SegmentedSlider label="Album textures" value={settings.albumTextures} options={TEXTURE_OPTIONS} onChange={(value) => guardedSetGfx('albumTextures', value)} night={night} />
                        <SegmentedSlider label="Background paper" value={settings.paper} options={BOOLEAN_OPTIONS} onChange={(value) => guardedSetGfx('paper', value)} night={night} />
                        <SegmentedSlider label="Shadows" value={settings.shadows} options={BOOLEAN_OPTIONS} onChange={(value) => guardedSetGfx('shadows', value)} night={night} />
                        <SegmentedSlider label="Toolbar blur" value={settings.blur} options={BOOLEAN_OPTIONS} onChange={(value) => guardedSetGfx('blur', value)} night={night} />
                    </FxGroup>

                    <FxGroup title="Animation" open={openGroups.animation} onToggle={() => toggleGroup('animation')} night={night}>
                        {ANIMATION_ROWS.map((row) => (
                            <FxSwitch
                                key={row.key}
                                checked={settings[row.key]}
                                onChange={(value) => setBoolean(row.key, value)}
                                night={night}
                                label={row.label}
                                hint={row.hint}
                            />
                        ))}
                    </FxGroup>

                    <FxGroup title="Controls" open={openGroups.controls} onToggle={() => toggleGroup('controls')} night={night}>
                        {CONTROL_ROWS.map((row) => (
                            <FxSwitch
                                key={row.key}
                                checked={settings[row.key]}
                                onChange={(value) => setBoolean(row.key, value)}
                                night={night}
                                label={row.label}
                                hint={row.hint}
                            />
                        ))}
                    </FxGroup>

                    <p className={`px-1 pb-1 font-sans text-[11.5px] leading-[1.45] ${night ? 'text-white/55' : 'text-[#7a6b74]'}`}>
                        Lower graphics settings reduce texture memory and compositing work on slower devices.
                    </p>
                </div>
            </div>

            {pendingHeavy && (
                <GraphicsWarningModal night={night} onConfirm={confirmHeavy} onCancel={() => setPendingHeavy(null)} />
            )}
        </>
    );
}
