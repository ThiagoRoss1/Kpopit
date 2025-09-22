// Guesses Grid component
import React from "react";
import type {
  IdolListItem,
  GuessResponse,
} from "../../interfaces/gameInterfaces";
import { Grid, GridItem, Text, Image } from "@chakra-ui/react";

interface GuessesGridProps {
  guesses: GuessResponse[];
  allIdols: IdolListItem[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "correct":
      return "green.300";

    case "partial":
      return "yellow.300";

    case "incorrect":
      return "red.300";

    case "higher":
      return "blue.300";

    case "lower":
      return "purple.300";

    default:
      return "gray.300";
  }
};

const GuessesGrid = (props: GuessesGridProps) => {
  const { guesses } = props;

  return (
    <Grid templateColumns="repeat(8, 1fr)" gap={2} alignItems="center">
      {[...guesses].reverse().map((guess, index) => (
        <React.Fragment key={index}>
          <GridItem bg={getStatusColor(guess.feedback.artist_name.status)}>
            <Image
              src="/assets/placeholder.png"
              alt="Placeholder"
              boxSize="50px"
              gridColumn="span 1"
            />
            <Text>{guess.guessed_idol_data.artist_name}</Text>{" "}
            {/* TODO: Nome da idol aparece acima da imagem, mas sem check de cor */}
          </GridItem>

          <GridItem bg={getStatusColor(guess.feedback.groups?.status)}>
            <Text>
              {Array.isArray(guess.guessed_idol_data.groups)
                ? guess.guessed_idol_data.groups.map((groups, index) => (
                    <React.Fragment key={index}>
                      {groups}
                      <br />
                    </React.Fragment>
                  ))
                : guess.guessed_idol_data.groups}
            </Text>
          </GridItem>

          <GridItem bg={getStatusColor(guess.feedback.companies?.status)}>
            <Text>
              {Array.isArray(guess.guessed_idol_data.companies)
                ? guess.guessed_idol_data.companies.map((companies, index) => (
                    <React.Fragment key={index}>
                      {companies}
                      <br />
                    </React.Fragment>
                  ))
                : guess.guessed_idol_data.companies}
            </Text>
          </GridItem>

          <GridItem bg={getStatusColor(guess.feedback.nationality?.status)}>
            <Text>
              {Array.isArray(guess.guessed_idol_data.nationality)
                ? guess.guessed_idol_data.nationality.map(
                    (nationality, index) => (
                      <React.Fragment key={index}>
                        {nationality}
                        <br />
                      </React.Fragment>
                    )
                  )
                : guess.guessed_idol_data.nationality}
            </Text>
          </GridItem>

          <GridItem bg={getStatusColor(guess.feedback.birth_year?.status)}>
            {" "}
            {/* TODO: Mudar no backend para birth date (dia / mes / ano) */}
            <Text>{guess.guessed_idol_data.birth_year}</Text>
          </GridItem>

          <GridItem bg={getStatusColor(guess.feedback.idol_debut_year?.status)}>
            <Text>{guess.guessed_idol_data.idol_debut_year}</Text>
          </GridItem>

          <GridItem bg={getStatusColor(guess.feedback.height?.status)}>
            <Text>{guess.guessed_idol_data.height} cm</Text>
          </GridItem>

          <GridItem bg={getStatusColor(guess.feedback.position?.status)}>
            <Text>
              {Array.isArray(guess.guessed_idol_data.position)
                ? guess.guessed_idol_data.position.map((position, index) => (
                    <React.Fragment key={index}>
                      {position}
                      <br />
                    </React.Fragment>
                  ))
                : guess.guessed_idol_data.position}
            </Text>
          </GridItem>
        </React.Fragment>
      ))}
    </Grid>
  );
};

export default GuessesGrid;
