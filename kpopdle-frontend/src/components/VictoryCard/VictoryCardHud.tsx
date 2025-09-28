//import React from "react";
import type { GuessedIdolData } from "../../interfaces/gameInterfaces";

interface VictoryCardHudProps {
    cardinfo: GuessedIdolData
    attempts: number;
    yesterdayidol: string;
}

const VictoryCardHudProps = (props: VictoryCardHudProps) => {
    const { cardinfo, attempts, yesterdayidol } = props;



return (
    <div>
        <form>
            <ul>
                <li>{cardinfo.artist_name}</li>
                <li>Congratulations!</li>
                <li>Attempts: {attempts}!</li>
                <li>Yesterday's Idol: {yesterdayidol}</li>
            </ul>
        </form>
    </div>


)};















export default VictoryCardHudProps;