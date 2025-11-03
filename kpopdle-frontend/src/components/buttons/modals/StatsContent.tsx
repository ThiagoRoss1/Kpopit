import type { UserStats } from "../../../interfaces/gameInterfaces.ts";

interface StatsContentProps {
    stats: UserStats | undefined;
}

const StatsText = (props: StatsContentProps) => {
    const { stats } = props;

    return (
        <div className="w-full h-full bg-transparent px-10 mt-5 mb-5">
            <div className="w-full h-full grid grid-cols-2 justify-center items-center gap-x-16 gap-y-6">
                {/* Games won */}
                <div className="flex flex-col justify-center items-center p-4 gap-3 rounded-2xl border-2 border-white sm:h-28 
                backface-hidden shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)] bg-black/50
                hover:scale-105 hover:brightness-110 hover:bg-black hover:rotate-1 hover:cursor-default transition-all duration-500 transform-gpu">
                    <h3 className="relative font-bold text-2xl text-[#b43777] drop-shadow-lg 
                    [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">Games won</h3>
                    <span className="text-3xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.55)]">{stats?.wins_count}</span>
                </div>

                {/* Average guesses */}
                <div className="flex flex-col justify-center items-center p-4 gap-3 rounded-2xl border-2 border-white sm:h-28 
                backface-hidden shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)] bg-black/50
                hover:scale-105 hover:brightness-110 hover:bg-black hover:-rotate-1 hover:cursor-default transition-all duration-500 transform-gpu">
                    <h3 className="relative font-bold text-2xl text-[#b43777] drop-shadow-lg 
                    [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">Average Guesses</h3>
                    <span className="text-3xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.55)]">{stats?.average_guesses.toFixed(2)}</span>
                </div>

                {/* Current streak */}
                <div className="flex flex-col justify-center items-center p-4 gap-3 rounded-2xl border-2 border-white sm:h-28 
                backface-hidden shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)] bg-black/50
                hover:scale-105 hover:brightness-110 hover:bg-black hover:rotate-1 hover:cursor-default transition-all duration-500 transform-gpu">
                    <h3 className="relative font-bold text-2xl text-[#b43777] drop-shadow-lg 
                    [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">Current Streak</h3>
                    <span className="text-3xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.55)]">{stats?.current_streak}</span>
                </div>

                {/* Max streak */}
                <div className="flex flex-col justify-center items-center p-4 gap-3 rounded-2xl border-2 border-white sm:h-28 
                backface-hidden shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)] bg-black/50
                hover:scale-105 hover:brightness-110 hover:bg-black hover:-rotate-1 hover:cursor-default transition-all duration-500 transform-gpu">
                    <h3 className="relative font-bold text-2xl text-[#b43777] drop-shadow-lg 
                    [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">Max Streak</h3>
                    <span className="text-3xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.55)]">{stats?.max_streak}</span>
                </div>
            </div>

                {/* One shot wins */}
                <div className="flex flex-col justify-center items-center p-4 gap-3 rounded-2xl border-2 border-white sm:h-28 
                backface-hidden shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)] bg-black/50
                hover:scale-105 hover:brightness-110 hover:bg-black hover:-translate-y-2 hover:cursor-default transition-all duration-500 transform-gpu mt-6">
                    <h3 className="relative font-bold text-2xl text-[#b43777] drop-shadow-lg 
                    [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">One Shot Wins</h3>
                    <span className="text-3xl [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.55)]">{stats?.one_shot_wins}</span>
                </div>   

                <div className="flex justify-between px-10 items-center mt-6">
                    <button 
                        onClick={() => console.log("Work in progress... (Transfer data button)")}
                        className="bg-black/50 sm:w-60 sm:h-12 rounded-2xl border-2 border-white
                        backface-hidden shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)]
                        hover:scale-105 hover:brightness-110 hover:bg-black hover:cursor-default transition-all duration-500 transform-gpu">
                        <span className="relative font-bold text-[20px] text-[#b43777] drop-shadow-lg
                        [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">
                            Transfer data
                        </span>
                    </button>

                    <button
                        onClick={() => console.log("Work in progress... (Copy button)")}
                        className="bg-black/50 sm:w-60 sm:h-12 rounded-2xl border-2 border-white
                        backface-hidden shadow-[0_0_10px_2px_rgba(255,255,255,0.25),0_0_10px_2px_rgba(255,255,255,0.25)]
                        hover:scale-105 hover:brightness-110 hover:bg-black hover:cursor-default transition-all duration-500 transform-gpu">
                        <span className="relative font-bold text-[20px] text-[#b43777] drop-shadow-lg
                        [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.55)]">
                            Copy
                        </span>
                    </button>

                    
                </div>    
        </div>
    )
}

export default StatsText;