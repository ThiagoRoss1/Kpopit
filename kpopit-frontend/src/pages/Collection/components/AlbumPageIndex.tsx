import type { AlbumGroup } from '../../../interfaces/albumInterfaces';
import { Search, Check } from 'lucide-react';

interface AlbumPageIndexProps {
    collectionName: string;
    groups: AlbumGroup[];
    currentGroupId: number | null;
    onJump: (groupId: number) => void;
    query: string;
    onQueryChange: (query: string) => void;
    night: boolean;
}

function GroupRow({
    group,
    active,
    onJump,
    night,
}: {
    group: AlbumGroup;
    active: boolean;
    onJump: () => void;
    night: boolean;
}) {
    const owned = group.members.filter((member) => member.owned).length;
    const total = group.members.length;
    const complete = owned === total;

    return (
        <button
            type="button"
            onClick={onJump}
            className={`flex w-full cursor-pointer items-center gap-2.75 rounded-[11px] border-[1.5px] px-2.75 py-2.25 text-left transition-all duration-300 ${
                active
                    ? night
                        ? 'border-neon-pink bg-ink/60 shadow-[2px_2px_0px_#FF3399]'
                        : 'border-ink bg-neon-pink/10 shadow-[2px_2px_0px_#0a0a0a]'
                    : `border-transparent ${night ? 'hover:bg-white/5' : 'hover:bg-[#e64c67]/6'}`
            }`}
        >
            <span className="h-8.5 w-2 flex-none rounded-[3px]" style={{ background: group.palette.main }} />
            
            <span className="min-w-0 flex-1">
                <span className="flex flex-col items-baseline gap-1.5">
                    <span
                        className={`font-major-mono-display overflow-hidden text-ellipsis whitespace-nowrap text-[14px] transition-colors duration-300
                        ${night ? 'text-white' : 'text-[#3c2f38]'} uppercase`}
                    >
                        {group.group_name}
                    </span>
                    {/* {group.hangul_name && (
                        <span className={`font-korean text-[10px] ${night ? 'text-white/62' : 'text-[#7a6b74]'}`}>
                            {group.hangul_name}
                        </span>
                    )} */}
                </span>
                <span className={`mt-1.25 block h-1 overflow-hidden rounded-full transition-colors duration-300 ${night ? 'bg-white/13' : 'bg-[#3c2f38]/14'}`}>
                    <span
                        className="block h-full"
                        style={{ width: `${total > 0 ? Math.round((owned / total) * 100) : 0}%`, background: group.palette.main }}
                    />
                </span>
            </span>
            <span
                className={`flex flex-row gap-1 items-center justify-center text-center whitespace-nowrap font-mono text-[12px] font-bold transition-colors duration-300 ${!complete ? (night ? 'text-white/62' : 'text-[#7a6b74]') : ''}`}
                style={complete ? { color: group.palette.main } : undefined}
            >
                {complete 
                    ? <Check className="w-5 h-5 text-green-500" /> 
                    : `${owned}/${total}`
                }
            </span>
        </button>
    );
}

export default function AlbumPageIndex({ collectionName, groups, currentGroupId, onJump, query, onQueryChange, night }: AlbumPageIndexProps) {
    const searchTerm = query.trim().toLowerCase();

    const filteredGroups = groups.filter((group) =>
        `${group.group_name} ${group.hangul_name}`.toLowerCase().includes(searchTerm),
    );

    const total = groups.reduce((sum, group) => sum + group.members.length, 0);
    const owned = groups.reduce((sum, group) => sum + group.members.filter((member) => member.owned).length, 0);

    const progressPercentage = total > 0 ? Math.round((owned / total) * 100) : 0;
    
    const accentText = night ? 'text-neon-pink' : 'text-[#C62368]';

    return (
        <>
            <p className={`font-mono text-[10px] uppercase tracking-[0.22em] transition-colors duration-300 ${accentText}`}>Summary</p>
            <p className={`font-major-mono-display mt-0.75 text-[20px] tracking-[0.02em] transition-colors duration-300 ${night ? 'text-white' : 'text-[#3c2f38]'} uppercase`}>
                {collectionName}
            </p>
            <p className={`mt-1 font-sans text-[11px] font-semibold transition-colors duration-300 ${night ? 'text-white/62' : 'text-[#7a6b74]'}`}>
                {groups.length} groups · {total} stickers
            </p>
            {/* Full-bleed: bar + % align flush-left with the album name / header text above. */}
            <div className="mt-3 flex items-center gap-2">
                <div className={`h-2 flex-1 overflow-hidden rounded-full transition-colors duration-300 ${night ? 'bg-white/13' : 'bg-[#3c2f38]/14'}`}>
                    <div
                        className={`h-full bg-linear-to-r ${night ? 'from-neon-pink to-[#FA7268]' : 'from-neon-pink to-[#FA7268]'}`}
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                <span className={`font-major-mono-display text-[14px] transition-colors duration-300 ${accentText}`}>{progressPercentage}%</span>
            </div>
            <div
                className={`mt-3.5 flex items-center gap-2 rounded-full border-[1.5px] px-3.25 py-2 transition-colors duration-300 ${
                    night ? 'border-neon-pink/40 bg-[#1c1f27] shadow-[2px_2px_0px_#FF3399]' : 'border-ink bg-white shadow-[2px_2px_0px_#0a0a0a]'
                }`}
            >
                <Search className={`w-4 h-4 rotate-90 ${accentText}`} />

                <input
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder="Search for a group…"
                    className={`min-w-0 flex-1 border-none bg-transparent font-sans text-[12px] font-semibold outline-none transition-colors duration-300 ${
                        night ? 'text-white placeholder:text-white/40' : 'text-[#3c2f38] placeholder:text-[#a596a0]'
                    }`}
                />
            </div>
            
            <div className="mt-2 -mx-1 flex min-h-0 flex-col gap-0.5 overflow-y-auto px-1 py-1 contain-[paint]">
                {filteredGroups.map((group) => (
                    <GroupRow
                        key={group.group_id}
                        group={group}
                        active={group.group_id === currentGroupId}
                        onJump={() => onJump(group.group_id)}
                        night={night}
                    />
                ))}
                {filteredGroups.length === 0 && (
                    <p className={`p-4 text-center font-sans text-[12px] transition-colors duration-300 ${night ? 'text-white/62' : 'text-[#7a6b74]'}`}>
                        No groups found.
                    </p>
                )}
            </div>
        </>
    );
}
