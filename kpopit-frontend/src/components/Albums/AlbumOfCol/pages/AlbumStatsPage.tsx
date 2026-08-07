import AlbumCoverShell from '../shell/AlbumCoverShell';
import type { AlbumStats } from '../../../../interfaces/albumInterfaces';

const TITLE_GRADIENT_CLASS = 'bg-[linear-gradient(90deg,#C62368_0%,#E34C67_50%,#FA7268_100%)]';
const NUMBER_GRADIENT_CLASS = 'bg-[linear-gradient(0deg,#D53867,#EF5F67)]';
const BAR_FILL_GRADIENT_CLASS = 'bg-[linear-gradient(90deg,#C62368,rgba(227,76,103,0.64)_70%,rgba(250,114,104,0.25)_100%)]';

interface AlbumStatsPageProps {
    stats: AlbumStats;
}

export default function AlbumStatsPage({ stats }: AlbumStatsPageProps) {
    const percentage = stats.total > 0 ? Math.round((stats.owned / stats.total) * 100) : 0;
    return (
        <AlbumCoverShell mirrored spine="fold-right">
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-120 w-95 rounded-bl-[80px] rounded-tr-[80px] bg-[#d9d9d9] shadow-[2px_-2px_6px_1px_rgba(0,0,0,0.3)]">
                    <div className="flex size-full flex-col items-start justify-start px-6 py-6">
                        <div className="font-major-mono-display flex items-center gap-2 text-[12px] leading-[normal] text-[#2d2d2d] drop-shadow-[1px_1px_1px_rgba(0,0,0,0.5)]">
                            <span>OFFICIAL COLLECTION</span>
                            <span className="size-1.5 rounded-full bg-[#2d2d2d]" />
                            <span>KPOPIT</span>
                        </div>
                        <div className="mt-31 flex flex-col">
                            <p className={`font-major-mono-display bg-clip-text text-[32px] leading-[normal] text-transparent [text-shadow:1px_1px_2px_rgba(0,0,0,0.25)] ${TITLE_GRADIENT_CLASS}`}>
                                ALBUM PROGRESS
                            </p>
                            <div className="mt-2 flex items-end">
                                <span className={`bg-clip-text font-sans text-[52px] font-bold leading-[normal] text-transparent ${NUMBER_GRADIENT_CLASS}`}>
                                    {stats.owned}
                                </span>
                                <span className={`bg-clip-text pb-2 font-sans text-[26px] font-bold leading-[normal] text-transparent ${NUMBER_GRADIENT_CLASS}`}>
                                    /{stats.total}
                                </span>
                            </div>
                            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-br-[20px] rounded-tl-[20px] border border-white shadow-[2px_2px_2px_0px_rgba(0,0,0,0.3)]">
                                <div
                                    className={`h-full rounded-br-[20px] rounded-tl-[20px] ${BAR_FILL_GRADIENT_CLASS}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <div className="mt-3.25 grid w-60 grid-cols-2 gap-x-2.5 gap-y-0.75">
                                <p className="font-sans text-[22px] font-bold leading-[normal] text-white [text-shadow:1px_1px_2px_rgba(0,0,0,0.5)]">
                                    {stats.groups_complete}/{stats.groups_total}
                                </p>
                                <p className="font-sans text-[22px] font-bold leading-[normal] text-white [text-shadow:1px_1px_2px_rgba(0,0,0,0.5)]">
                                    {percentage}%
                                </p>
                                <p className="font-major-mono-display text-sm leading-[normal] text-[#2d2d2d] [text-shadow:1px_1px_2px_rgba(0,0,0,0.2)] uppercase">
                                    Groups
                                </p>
                                <p className="font-major-mono-display text-sm leading-[normal] text-[#2d2d2d] [text-shadow:1px_1px_2px_rgba(0,0,0,0.2)] uppercase">
                                    Collected
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AlbumCoverShell>
    );
}
