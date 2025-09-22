// Search bar component
import React, { useState } from "react";
import {
  Input,
  Box,
  List,
  ListItem,
  FormControl,
  InputGroup,
  InputRightElement,
  Button,
} from "@chakra-ui/react";
import type { IdolListItem } from "../../interfaces/gameInterfaces";
// import { div } from 'framer-motion/m'; - Future usage

interface SearchBarProps {
  allIdols: IdolListItem[];
  value: string;
  onSubmit?: () => void;
  excludedIdols?: number[];
  disabled?: boolean;

  // Handle selection
  onIdolSelect: (idolName: string) => void;
}

// function SearchBar ({ allIdols, onGuessSubmit }: SearchBarProps) {
//     const [inputValue, setInputValue] = useState<string>("");
// }

const SearchBar = (props: SearchBarProps) => {
  const { allIdols, value, onIdolSelect, onSubmit, disabled, excludedIdols } = props;

  // Input value and Suggestions state
  const [suggestions, setSuggestions] = useState<IdolListItem[]>([]);

  // Input .finder() - Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onIdolSelect(value);

    if (value.length > 0) {
      const filteredSuggestions = allIdols
        .filter((idol: IdolListItem) => {
          const matches = idol.artist_name.toLowerCase().includes(value.toLowerCase())
          const isNotExcluded = !excludedIdols?.includes(idol.id);

          return matches && isNotExcluded;
        })
        .slice(0, 10); // Limit to 10 suggestions
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  console.log("Excluded idols:", excludedIdols); // Debugging line to check excluded idols

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: IdolListItem) => {
    onIdolSelect(suggestion.artist_name);
    setSuggestions([]);
  };

  // Return JSX
  return (
    <div>
      <Box position="relative" width="300px">
        <FormControl>
          <InputGroup>
            <Input
              value={value}
              onChange={handleInputChange}
              placeholder="Idol"
              disabled={disabled}
            />
            <InputRightElement>
              <Button onClick={onSubmit} disabled={disabled} type="button">
                Guess
              </Button>
            </InputRightElement>
          </InputGroup>
          {suggestions.length > 0 && (
            <List
              position="absolute"
              width="100%"
              borderRadius="md"
              boxShadow="md"
              maxHeight="200px"
            >
              {suggestions.map((suggestion) => (
                <ListItem
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  p={2}
                  _hover={{ bg: "gray.200", cursor: "pointer" }}
                >
                  {suggestion.artist_name}
                </ListItem>
              ))}
            </List>
          )}
        </FormControl>
      </Box>
    </div>
  );
};

export default SearchBar;
