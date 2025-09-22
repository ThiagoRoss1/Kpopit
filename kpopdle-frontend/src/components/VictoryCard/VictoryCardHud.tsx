//import React from "react";
import { Box, FormControl, List, ListItem } from "@chakra-ui/react";
import type { GuessedIdolData } from "../../interfaces/gameInterfaces";

interface VictoryCardHudProps {
    cardinfo: GuessedIdolData
    attempts: number;
    yesterdayidol: string;
}

const VictoryCardHudProps = (props: VictoryCardHudProps) => {
    const { cardinfo, attempts, yesterdayidol } = props;



return (
    <Box>
        <FormControl>
            <List>
                <ListItem>{cardinfo.artist_name}</ListItem>
                <ListItem>Congratulations!</ListItem>
                <ListItem>Attempts: {attempts}!</ListItem>
                <ListItem>Yesterday's Idol: {yesterdayidol}</ListItem>
            </List>
        </FormControl>
    </Box>


)};















export default VictoryCardHudProps;