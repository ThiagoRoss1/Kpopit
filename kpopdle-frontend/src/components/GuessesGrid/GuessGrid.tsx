// Guesses Grid component
import React from "react";
import type {
  IdolListItem,
  GuessResponse,
} from "../../interfaces/gameInterfaces";

interface GuessesGridProps {
  guesses: GuessResponse[];
  allIdols: IdolListItem[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "correct":
      return "bg-green-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-md";

    case "partial":
      return "bg-yellow-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-md";

    case "incorrect":
      return "bg-red-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-md";

    case "higher":
      return "bg-blue-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-md";

    case "lower":
      return "bg-purple-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-md";

    default:
      return "bg-gray-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-md";
  }
};

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
    <div className="w-full h-fit max-w-full sm:max-w-[894px] mx-auto flex items-center border border-white/50">
      <div className="grid grid-cols-8 gap-4 p-4 justify-items-center items-center w-full max-w-6xl mx-auto">
        {headers.map((header) => (
          <div key={header} className="font-bold text-[16px] text-pretty text-center text-white w-full h-fit pb-1">
            {header}
            <hr className="w-full h-fill sm:h-[4px] bg-white rounded-[20px] mt-2" />
          </div>
        ))}
        

        {/* <div className="columns-8 gap-2 w-full h-[2px] sm:h-[4px] justify-items-center items-center bg-amber-800"></div> */}
        
        {[...guesses].reverse().map((guess, index) => (
          <React.Fragment key={index}>
            <div className={`${getStatusColor(guess.feedback.artist_name.status)} w-full h-fit sm:h-[100px] sm:w-[100px] p-2 flex flex-col items-center justify-center text-center rounded-[20px] space-y-1 inset-shadow-sm`}>
              <img
                src="/assets/placeholder.png"
                alt="Placeholder"
                className="w-[50px] h-[50px] col-span-1"
              />
              <p>{guess.guessed_idol_data.artist_name}</p>{" "}
              {/* TODO: Nome da idol aparece acima da imagem, mas sem check de cor */}
            </div>

            <div className={`${getStatusColor(guess.feedback.groups?.status)} w-full h-fit sm:h-[100px] sm:w-[100px] p-2 flex flex-col items-center justify-center text-center rounded-[20px] space-y-1`}>
              <p>
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

            <div className={`${getStatusColor(guess.feedback.companies?.status)} w-full h-fit sm:h-[100px] sm:w-[100px] p-2 flex flex-col items-center justify-center text-center rounded-[20px] space-y-1`}>
              <p>
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

            <div className={`${getStatusColor(guess.feedback.nationality?.status)} w-full h-fit sm:h-[100px] sm:w-[100px] p-2 flex flex-col items-center justify-center text-center rounded-[20px] space-y-1`}>
              <p>
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

            <div className={`${getStatusColor(guess.feedback.birth_year?.status)} w-full h-fit sm:h-[100px] sm:w-[100px] p-2 flex flex-col items-center justify-center text-center rounded-[20px] space-y-1`}>
              {" "}
              {/* TODO: Mudar no backend para birth date (dia / mes / ano) */}
              <p>{guess.guessed_idol_data.birth_year}</p>
            </div>

            <div className={`${getStatusColor(guess.feedback.idol_debut_year?.status)} w-full h-fit sm:h-[100px] sm:w-[100px] p-2 flex flex-col items-center justify-center text-center rounded-[20px] space-y-1`}>
              <p>{guess.guessed_idol_data.idol_debut_year}</p>
            </div>

            <div className={`${getStatusColor(guess.feedback.height?.status)} w-full h-fit sm:h-[100px] sm:w-[100px] p-2 flex flex-col items-center justify-center text-center rounded-[20px] space-y-1`}>
              <p>{guess.guessed_idol_data.height} cm</p>
            </div>

            <div className={`${getStatusColor(guess.feedback.position?.status)} w-full h-fit sm:h-[100px] sm:w-[100px] p-2 flex flex-col items-center justify-center text-center rounded-[20px] space-y-1`}>
              <p>
                {Array.isArray(guess.guessed_idol_data.position)
                  ? guess.guessed_idol_data.position.map((position, index) => (
                      <React.Fragment key={index}>
                        {position}
                        <br />
                      </React.Fragment>
                    ))
                  : guess.guessed_idol_data.position}
              </p>
            </div>
          </React.Fragment>
        ))}
      </div>
  </div>
  );
};

export default GuessesGrid;
