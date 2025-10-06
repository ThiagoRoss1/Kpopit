interface AnswerHintsBoxProps {
    memberCount: number | null;
    groups?: string[] | null;
}

const AnswerHintsBox = (props: AnswerHintsBoxProps) => {
    const {memberCount, groups} = props;

    const memberCountDisplay = memberCount ?? "Soloist"; // == memberCount !== null ? memberCount : "Soloist"; As i'm returning Null
    const groupsDisplay = groups && groups.length > 0 ? groups : ["Soloist"];


    return (
        <div className="w-full h-fit max-w-full sm:max-w-[458px] sm:max-h-[92px] mx-auto 
        flex items-center justify-between gap-4 rounded-[15px] px-[23px] bg-gradient-to-b from-white/0 to-[#b4b4b4]/0">

                {/* Box 1 */}
                <div className="w-full h-fit sm:w-[196px] sm:h-[92px] border-t-2 border-solid border-white/20
                rounded-[8px] backdrop-blur-md shadow-[4px_4px_4px_1px_rgba(0,0,0,0.25),inset_0_4px_4px_rgba(0,0,0,0.25)]
                bg-gradient-to-b from-[#313131]/10 via-white/10 to-white/10 flex items-center justify-center">
                    <p className="text-center">Member Count = {memberCountDisplay}</p>
                </div>

                {/* Box 2 */}
                <div className="w-full h-fit sm:w-[196px] sm:h-[92px] border-t-2 border-solid border-white/20
                rounded-[8px] backdrop-blur-md shadow-[4px_4px_4px_1px_rgba(0,0,0,0.25),inset_0_4px_4px_rgba(0,0,0,0.25)]
                bg-gradient-to-b from-[#313131]/10 via-white/10 to-white/10 flex items-center justify-center">
                    <p className="text-center">Groups = {groupsDisplay}</p>
                </div>
        </div>
    );
};

export default AnswerHintsBox;