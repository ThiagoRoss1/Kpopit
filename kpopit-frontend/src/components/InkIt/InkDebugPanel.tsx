import { useEffect, useState, type RefObject } from "react";
import { TOOL_IDS } from "../../features/inkit/config.ts";
import type { InkPen } from "../../features/inkit/engine.ts";

interface InkDebugPanelProps {
    pen: RefObject<InkPen>;
    round: number;
}

/** Playtest numbers. Only mounted in dev builds with ?debug=1; never part of a production bundle. */
const InkDebugPanel = ({ pen, round }: InkDebugPanelProps) => {
    const [seconds, setSeconds] = useState(0);

    // The pen lives in a ref: this tick is what re-reads it.
    useEffect(() => {
        const startedAt = performance.now();
        const timer = window.setInterval(() => setSeconds((performance.now() - startedAt) / 1000), 250);

        return () => window.clearInterval(timer);
    }, []);

    const state = pen.current;

    return (
        <aside
            data-testid="inkit-debug"
            className="fixed right-3 bottom-3 z-150 w-52 p-3 rounded-2xl border-2 border-(--ink) bg-(--menu-bg) font-mono text-[11px] leading-relaxed text-(--chip-ink)"
        >
            <div>round {round} · {Math.round(seconds)}s</div>
            <div>ink {state.ink.toFixed(1)} / {state.capacity.toFixed(0)}</div>
            {TOOL_IDS.map((tool) => <div key={tool}>{tool}: {state.spentByTool[tool].toFixed(1)}</div>)}
            <div>last stroke: {state.lastStrokeCost.toFixed(1)}</div>
            <div>speed: {state.speed.toFixed(2)}</div>
        </aside>
    );
};

export default InkDebugPanel;
