import { CHANGELOG } from "../../../content/changelog";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${MONTHS[Number(m) - 1]} ${d}, ${y}`;
};

// The home page's changelog modal: same entries as /changelog (src/data/changelog.ts), old look.
const ChangelogText = () => {

    const divClass = `flex flex-col justify-center items-center max-xxs:w-70 xxs:w-80 sm:w-100 gap-3 rounded-lg p-4
            shadow-[0_0_10px_2px_rgba(255,255,255,0.15),0_0_10px_2px_rgba(255,255,255,0.15)] wrap-break-word text-center`;

    const textClass = "text-white text-lg [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.40)]";
    return (
        <div className="w-full bg-transparent mt-5 mb-5">
            <div className="w-full flex flex-col justify-center items-center gap-y-4">
                {CHANGELOG.map((entry) => (
                    <div key={entry.date} className={`${divClass} bg-gray-900 border-2 border-white`}>
                        <h3 className={textClass}>{longDate(entry.date)}</h3>
                        <p className={`${textClass} text-center`}>{entry.title}</p>
                        {entry.items.map((item) => (
                            <p key={item.text} className={`${textClass} text-center`}>{item.text}</p>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ChangelogText;
