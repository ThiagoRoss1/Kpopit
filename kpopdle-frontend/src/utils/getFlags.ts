import kr from "../assets/flags/kr.svg";
import jp from "../assets/flags/jp.svg";
import cn from "../assets/flags/cn.svg";
import tw from "../assets/flags/tw.svg";
import th from "../assets/flags/th.svg";
import hk from "../assets/flags/hk.svg";
import vn from "../assets/flags/vn.svg";
import us from "../assets/flags/us.svg";
import ca from "../assets/flags/ca.svg";
import au from "../assets/flags/au.svg";
import nz from "../assets/flags/nz.svg";
import de from "../assets/flags/de.svg";
import nl from "../assets/flags/nl.svg";

const flags: Record<string, string> = {
    "South Korean": kr,
    "Japanese": jp,
    "Chinese": cn,
    "Taiwanese": tw,
    "Thai": th,
    "Hong Kongese": hk,
    "Vietnamese": vn,
    "American": us,
    "Canadian": ca,
    "Australian": au,
    "New Zealand": nz,
    "German": de,
    "Dutch": nl,
}

export const getNationalityFlag = (nationality: string): string | null => {

    return flags[nationality] || null;

};