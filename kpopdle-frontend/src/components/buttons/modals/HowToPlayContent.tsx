import { useResetTimer } from "../../../hooks/useResetTimer.tsx";
import type { UserStats } from "../../../interfaces/gameInterfaces.ts";

interface HowToPlayStatsProps {
    stats: UserStats | undefined;
}

const HowToPlayText = (props: HowToPlayStatsProps) => {
    const { formattedTime } = useResetTimer();
    const { stats } = props;

    return (
        <div>
            <div>
                <h2>Guess today's K-Pop Idol.</h2>
                <div>
                   <span>Next Idol in:</span> 
                   <div>
                     <span>{formattedTime}</span> <br/>
                     <span>{stats?.average_guesses}</span>
                   </div>
                   <span></span>
                </div>
                
                
            </div>
        </div>
    )


}

export default HowToPlayText