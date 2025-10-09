// Guesses Grid component
import React from "react";
import type {
  IdolListItem,
  GuessResponse,
} from "../../interfaces/gameInterfaces";
import ArrowUp from "../../assets/icons/arrow-fat-line-up-fill.svg";
import ArrowDown from "../../assets/icons/arrow-fat-line-down-fill.svg";

interface GuessesGridProps {
  guesses: GuessResponse[];
  allIdols: IdolListItem[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "correct":
      return "bg-[#4FFFB0] shadow-[0_0_10px_2px_rgba(79,255,176,0.15),0_0_10px_2px_rgba(79,255,176,0.15)] backdrop-blur-md";

    case "partial":
        return "bg-[#f3e563] shadow-[0_0_10px_2px_rgba(243,229,99,0.15),0_0_10px_2px_rgba(243,229,99,0.15)] backdrop-blur-md";

    case "incorrect":
      return "bg-[#fd5c63] shadow-[0_0_10px_2px_rgba(253,92,99,0.15),0_0_10px_2px_rgba(253,92,99,0.15)] backdrop-blur-md";

    case "higher":
      return "bg-[#fd5c63] shadow-[0_0_10px_2px_rgba(253,92,99,0.15),0_0_10px_2px_rgba(253,92,99,0.15)] backdrop-blur-md";

    case "lower":
      return "bg-[#fd5c63] shadow-[0_0_10px_2px_rgba(253,92,99,0.15),0_0_10px_2px_rgba(253,92,99,0.15)] backdrop-blur-md";

    default:
      return "bg-gray-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-md";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "higher":
      return ArrowDown;
    
    case "lower":
      return ArrowUp;
  }
}

const getPositionColor = (position: string) => {
  switch (position) {
    case "correct_items":
      return "text-[#4FFFB0]";

    case "incorrect_items":
      return "text-white";

    default:
      return "text-white";
  }
}

const headers = [
  "Idol",
  "Group(s)",
  "Company",
  "Nationality",
  "Birth Year",
  "Debut Year",
  "Height",
  "Position(s)"
]

const GuessesGrid = (props: GuessesGridProps) => {
  const { guesses } = props;

  return (
    guesses.length > 0 && (
    <div className="w-full h-fit max-w-full sm:w-[960px] mx-auto sm:flex items-center overflow-x-auto">
      <div className="grid grid-cols-8 gap-4 p-4 justify-items-center items-center w-max mx-auto">
        {headers.map((header) => (
          <div key={header} className="font-bold text-[10px] sm:text-[16px] text-pretty text-center text-white w-full h-fit pb-1"> {/* see responsivity */}
            {header}
            <hr className="w-full h-fill sm:h-[4px] bg-white rounded-[20px] mt-2" />
          </div>
        ))}
        

        {/* <div className="columns-8 gap-2 w-full h-[2px] sm:h-[4px] justify-items-center items-center bg-amber-800"></div> */}
        
        {[...guesses].reverse().map((guess, index) => (
          <React.Fragment key={index}>
            <div className="bg-[#ffffff] shadow-[0_0_10px_2px_rgba(255,255,255,0.1),0_0_10px_2px_rgba(255,255,255,0.1)] backdrop-blur-md relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default hover:scale-105 transition-transform duration-300
            transform-gpu">
              <img
                src={`http://127.0.0.1:5000${guess.guessed_idol_data.image_path}`}
                alt="Placeholder"
                className="w-full h-full object-cover rounded-[16px]"
                draggable={false}
              />
              <span className=" font-light absolute bottom-0.5 text-[10px] sm:text-[14px] text-white [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">{guess.guessed_idol_data.artist_name}</span>{" "}
              {/* TODO: Nome da idol aparece acima da imagem, mas sem check de cor */}
            </div>

            <div className={`${getStatusColor(guess.feedback.groups?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default`}>
              <p className="text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">
                {Array.isArray(guess.guessed_idol_data.groups)
                  ? guess.guessed_idol_data.groups.map((groups, index) => (
                      <React.Fragment key={index}>
                        {groups}
                        <br />
                      </React.Fragment>
                    ))
                  : guess.guessed_idol_data.groups}
              </p>
            </div>

            <div className={`${getStatusColor(guess.feedback.companies?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default`}>
              <p className="text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">
                {Array.isArray(guess.guessed_idol_data.companies)
                  ? guess.guessed_idol_data.companies.map((companies, index) => (
                      <React.Fragment key={index}>
                        {companies}
                        <br />
                      </React.Fragment>
                    ))
                  : guess.guessed_idol_data.companies}
              </p>
            </div>

            <div className={`${getStatusColor(guess.feedback.nationality?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default`}>
              <p className="text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">
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
              </p>
            </div>

            <div className={`${getStatusColor(guess.feedback.birth_year?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default`}>
              {guess.feedback.birth_year?.status !== "correct" && (
                <img src={getStatusIcon(guess.feedback.birth_year?.status)}
                alt="Birth Year"
                className="w-18 h-18 sm:w-28 sm:h-28 object-cover"
                draggable={false} />
              )}
              {/* TODO: Mudar no backend para birth date (dia / mes / ano) */}
              <span className="absolute text-center text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">{guess.guessed_idol_data.birth_year}</span>
            </div>

            <div className={`${getStatusColor(guess.feedback.idol_debut_year?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default`}>
              {guess.feedback.idol_debut_year?.status !== "correct" && (
                <img src={getStatusIcon(guess.feedback.idol_debut_year?.status)}
                alt="Debut" 
                className="w-18 h-18 sm:w-28 sm:h-28 object-cover"
                draggable={false} />
                )}
                <span className="absolute text-center text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">{guess.guessed_idol_data.idol_debut_year}</span>
            </div>

            <div className={`${getStatusColor(guess.feedback.height?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default`}>
              {guess.feedback.height?.status !== "correct" && (
                <img src={getStatusIcon(guess.feedback.height?.status)}
                alt="Height"
                className="w-18 h-18 sm:w-28 sm:h-28 object cover"
                draggable={false} />
              )}
              <span className="absolute text-center text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">{guess.guessed_idol_data.height} cm</span>
            </div>

            <div className={`${getStatusColor(guess.feedback.position?.status)} relative w-18 h-18 sm:h-28 sm:w-28 flex flex-col items-center justify-center 
            text-center rounded-[18px] inset-shadow-sm border-2 border-white hover:brightness-120 hover:cursor-default`}>
              <p className="text-white text-[10px] sm:text-[14px] font-light [text-shadow:1.6px_1.6px_3px_rgba(26,26,26,0.8)]">
                {Array.isArray(guess.guessed_idol_data.position)
                  ? guess.guessed_idol_data.position.map((position, index) => {
                    const isCorrect = guess.feedback.position?.status !== "correct" && guess.feedback.position?.correct_items?.includes(position);
                    const isIncorrect = guess.feedback.position?.status !== "correct" && guess.feedback.position?.incorrect_items?.includes(position);
                    const colorClass = getPositionColor(isCorrect ? "correct_items" : isIncorrect ? "incorrect_items" : "");

                    return (
                      <React.Fragment key={index}>
                        <span className={colorClass}>{position}</span>
                        <br />
                      </React.Fragment>
                    );
                  })
                  : guess.guessed_idol_data.position}
              </p>
            </div>
          </React.Fragment>
        ))}
      </div>
  </div>
  ));
};

export default GuessesGrid;
