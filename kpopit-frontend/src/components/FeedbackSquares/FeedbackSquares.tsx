import { useState, useRef } from "react";
import ArrowUp from "../../assets/icons/arrow-fat-line-up-fill.svg";
import ArrowDown from "../../assets/icons/arrow-fat-line-down-fill.svg";
import { X } from "lucide-react";

interface FeedbackSquaresProps {
  onClose?: () => void;
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

const statuses = [
  {key: "correct", label: "Correct"}, 
  {key: "partial", label: "Partial"}, 
  {key: "incorrect", label: "Incorrect"}, 
  {key: "lower", label: "Higher"}, 
  {key: "higher", label: "Lower"}
];

const FeedbackSquares = (props: FeedbackSquaresProps) => {
  const { onClose } = props;

  const [isTouched, setIsTouched] = useState<boolean>(false);
  const hideTimeout = useRef<number | null>(null);

    return (
        <div className="w-full flex items-center justify-center">
            <div className="group w-90 h-25 sm:w-90 sm:h-30 rounded-2xl border border-white/0 items-center justify-center flex relative"
   
            onTouchStart={() => {
              if (hideTimeout.current) {
                clearTimeout(hideTimeout.current);
                hideTimeout.current = null;
              }

              setIsTouched(true);
              }}
              onTouchEnd={() => {
                hideTimeout.current = setTimeout(() => {
                  setIsTouched(false);
                }, 1200);
                }}
              >
              <div className={`${isTouched ? "opacity-100" : "opacity-0"} sm:opacity-0 sm:group-hover:opacity-100 absolute -top-1 rounded-lg right-2 w-5 h-5 mt-2 pointer-events-auto`}>
                <button className="flex items-center justify-center w-full h-full
                hover:scale-105 hover:brightness-110 hover:cursor-pointer transition-all duration-300 transform-gpu" onClick={onClose}>
                  <X color="white" className="w-5 h-5 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2 sm:gap-2 pointer-events-none">
                {statuses.map((status, index) => (
                  <div
                  key={index}
                  className="flex flex-col items-center justify-center gap-1">

                    <div className={`w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border border-white ${getStatusColor(status.key)}`}>
                    
                    {getStatusIcon(status.key) && (
                      <img src={getStatusIcon(status.key)!} alt="status" className="w-10 h-10 sm:w-10 sm:h-10" draggable={false} />
                    )}
                      </div>

                      <span className="normal-font font-bold text-white text-[12px] sm:text-[12px]">
                        {status.label}
                      </span>
                    </div>
                ))}
              </div>

            </div>
        </div>
    )
}

export default FeedbackSquares;