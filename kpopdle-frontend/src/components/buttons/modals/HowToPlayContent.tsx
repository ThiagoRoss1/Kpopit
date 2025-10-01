import { useResetTimer } from "../../../hooks/useResetTimer.tsx";

const HowToPlayText = () => {
    const { formattedTime } = useResetTimer();

    return (
        <div>
            <div>
                <h2>Guess today's K-Pop Idol.</h2>
                <div>
                   <p>Next Idol in:</p> 
                   <div>
                     <p>{formattedTime}</p>
                   </div>
                   <p></p>
                </div>
                
                
            </div>
        </div>
    )


}

export default HowToPlayText