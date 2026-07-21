import { COVER_PALETTE } from '../../components/Albums/AlbumOfCol/albumConstants';
import { resolveCdnUrl } from '../../utils/imageUrl';
import type { AlbumGroup, CollectionAlbumGroup } from '../../interfaces/albumInterfaces';

export function toAlbumGroups(data: CollectionAlbumGroup[]): AlbumGroup[] {
    return data.map((group, index) => ({
        group_id: group.group_id,
        group_name: group.group_name,
        hangul_name: group.hangul_name ?? '',
        debut_year: group.debut_year,
        fandom_name: group.fandom_name ?? '',
        company: group.company ?? '',
        label: group.label ?? '',
        set: String(index + 1).padStart(2, '0'),
        palette: group.palette?.main ? group.palette : COVER_PALETTE,
        group_photo: group.group_photo
        ? {
            card_id: group.group_photo.card_id,
            owned: group.group_photo.owned,
            src: resolveCdnUrl(group.image_path, group.image_version)
          }
        : null,
        members: group.members.map((member) => ({
            idol_id: member.idol_id,
            artist_name: member.artist_name,
            card_id: member.card_id,
            src: resolveCdnUrl(member.image_path, member.image_version),
            owned: member.owned,
            level: member.level,
        })),
    }));
}
