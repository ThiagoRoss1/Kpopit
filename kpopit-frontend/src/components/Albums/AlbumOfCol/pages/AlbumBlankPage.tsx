import AlbumContentShell from '../shell/AlbumContentShell';
import { AlbumMembersFrame } from './AlbumMembersPage';
import type { AlbumGroup } from '../../../../interfaces/albumInterfaces';

interface AlbumBlankPageProps {
    group: AlbumGroup;
    pageLabel: string;
}

export default function AlbumBlankPage({ group, pageLabel }: AlbumBlankPageProps) {
    const owned = group.members.filter((m) => m.owned).length;
    return (
        <AlbumContentShell groupName={group.group_name} palette={group.palette} side="right">
            <AlbumMembersFrame group={group} pageLabel={pageLabel}>
                <div className="z-20 flex flex-col items-center gap-3 self-center">
                    <div className="flex h-25 w-80.25 flex-col items-center justify-center rounded-br-[20px] rounded-tl-[20px] bg-[#2d2d2d] p-3.5">
                        <div className="font-major-mono-display flex flex-col items-center whitespace-nowrap text-center text-[32px] leading-[normal] text-(--album-light) drop-shadow-[2px_2px_1px_rgba(0,0,0,0.5)]">
                            <p>{group.group_name.toUpperCase()}</p>
                            <p>
                                {owned}/{group.members.length}
                            </p>
                        </div>
                    </div>
                    <p className="font-major-mono-display w-full text-center text-[22px] leading-[normal] 
                    text-black [text-shadow:2px_2px_2px_rgba(0,0,0,0.25)] uppercase">
                        Next Page →
                    </p>
                </div>
            </AlbumMembersFrame>
        </AlbumContentShell>
    );
}
