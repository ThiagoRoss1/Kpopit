import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import "./catalogue.css";

export interface FilterOption {
    value: string;
    label: string;
    icon?: ReactNode;
    count?: number;
}

/** A filter control: opens a menu of options (one choice); pink while a value is picked. */
export default function FilterMenu({ title, label, value, options, onPick, minWidth, icon, align = "left" }: {
    /** Menu heading (e.g. "TYPE"). */
    title: string;
    /** The button text: the picked option, or the filter's name. */
    label: string;
    value: string;
    options: FilterOption[];
    onPick: (value: string) => void;
    minWidth: string;
    icon?: ReactNode;
    align?: "left" | "right";
}) {
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const active = value !== "";

    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("pointerdown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const inset = active && !open ? "var(--in-pink)" : "var(--in)";
    return (
        <div ref={box} className="relative flex-(--cg-f-flex) min-w-0">
            <button
                type="button"
                aria-expanded={open}
                aria-haspopup="true"
                data-open={open ? "1" : "0"}
                data-on={active ? "1" : "0"}
                onClick={() => setOpen(!open)}
                className="cg-ctl cg-focus relative flex items-center gap-2 w-(--cg-f-w) h-(--cg-ctl-h) pr-[38px] pl-3.5 rounded-[18px] border-2 border-(--ink) font-semibold text-[13px] leading-[1.2] whitespace-nowrap text-left cursor-pointer"
                style={{
                    minWidth,
                    background: open ? "var(--chip-hover)" : active ? "var(--side)" : "var(--chip)",
                    color: active ? "#1A1418" : "var(--chip-ink)",
                    boxShadow: `${open ? "0 0 0 var(--ctl-off)" : "2px 3px 0 var(--ctl-off)"},${inset}`,
                }}
            >
                {icon}
                <span className="flex-1 min-w-0 overflow-hidden text-ellipsis">{label}</span>
                <ChevronDown aria-hidden className="cg-chev absolute right-3 w-3.5 h-3.5" strokeWidth={3} style={{ "--mr": open ? "180deg" : "0deg" } as CSSProperties} />
            </button>
            {open && (
                <div
                    role="menu"
                    aria-label={title}
                    className={cn("cg-menu absolute top-[calc(var(--cg-ctl-h)+12px)] w-[248px] z-20 bg-(--menu-bg) text-(--chip-ink) border-2 border-(--ink) rounded-[20px] overflow-hidden [box-shadow:4px_5px_0_var(--ctl-off),0_16px_32px_rgba(var(--sh),.16),var(--in)]", align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left")}
                >
                    <div className="flex items-center justify-between gap-2.5 pt-3 px-4 pb-2.5 border-b-[1.5px] border-dashed border-(--rule) font-bold text-[11px] leading-none tracking-[.12em] text-(--muted)">
                        <span>{title}</span>
                        <span className="tracking-normal font-medium">{`${options.length - 1} options`}</span>
                    </div>
                    <div className="cg-scroll max-h-[286px] overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-1">
                        {options.map((o) => {
                            const on = o.value === value;
                            return (
                                <button
                                    key={o.value || "all"}
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={on}
                                    onClick={() => { onPick(o.value); setOpen(false); }}
                                    className="cg-opt cg-focus flex-none flex items-center gap-2.5 min-h-[42px] text-left border-2 rounded-[13px] text-[13px] leading-[1.2] pr-2.5 pl-3 cursor-pointer"
                                    style={{
                                        borderColor: on ? "var(--ink)" : "transparent",
                                        background: on ? "var(--side)" : "transparent",
                                        color: on ? "#1A1418" : "var(--chip-ink)",
                                        boxShadow: on ? "2px 2.5px 0 var(--ink),var(--in-pink)" : "none",
                                        fontWeight: on ? 700 : 500,
                                    }}
                                >
                                    {o.icon}
                                    <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{o.label}</span>
                                    {o.count !== undefined && (
                                        <span className="flex-none min-w-6 h-5 px-[7px] inline-grid place-items-center rounded-full bg-white text-[#1A1418] border-[1.5px] border-[#1A1418] [box-shadow:1px_1.5px_0_#1A1418,inset_0_1.5px_0_rgba(255,255,255,.7)] font-bold text-[11px] leading-none">{o.count}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
