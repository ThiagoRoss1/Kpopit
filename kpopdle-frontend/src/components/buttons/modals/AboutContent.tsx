const AboutText = () => {
    return (
        <div className="w-full [text-shadow:1.6px_1.6px_3px_rgba(0,0,0,0.5)]">

            {/* Introduction Section */}
            <div className="w-full flex flex-col items-start justify-center">
                <span className="normal-font text-[18px]">Kpopdle is a <b>daily idol guessing game</b>.</span>
                <span className="normal-font text-[18px]">It's a Wordle-inspired project created by <b><a className="text-blue-500" href="https://github.com/ThiagoRoss1">ThiagoRoss1</a></b>, a K-pop fan and Computer Science student.</span>
            </div>

            {/* Game data Section */}
            <div className="w-full flex flex-col items-start justify-center mt-8 gap-1">
                <h3 className="text-4xl font-bold text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                    Game Data
                </h3>
            </div>

            <div className="w-full flex flex-col items-start justify-center border-t border-white mt-2">
                <span className="normal-font pt-1">Currently, there isn't a dedicated page for game data (idols, groups, etc.).</span>
                <span className="normal-font">But don't worry! That feature is on the way.</span>
            </div>

            {/* Credits Section */}
            <div className="w-full flex flex-col items-start justify-center mt-8 gap-1">
                <h3 className="text-4xl font-bold text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                    Inspiration
                </h3>
            </div>

            <div className="w-full flex flex-col items-start justify-center border-t border-white mt-2">
                <span className="normal-font pt-1">I initially drew inspiration from several word-guessing games and wanted to create something based on that concept.</span>
                <span className="normal-font">Then I thought — why not make a Wordle-like game for K-pop fans?</span>
                <span className="normal-font">During development, I discovered other K-pop guessing games and took inspiration from them as well.</span>
                <span className="normal-font">The games that inspired me the most were <b><a className="text-blue-500" href="https://onepiecedle.net/">Onepiecedle</a></b> and <b><a className="text-blue-500" href="https://www.kpople.net/">Kpople</a></b>.</span>
            </div>

            {/* Contact Section */}
            <div className="w-full flex flex-col items-start justify-center mt-8 gap-1">
                <h3 className="text-4xl font-bold text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                    Contact
                </h3>
            </div>

            <div className="w-full flex flex-col items-start justify-center border-t border-white mt-2">
                <span className="normal-font pt-1">You can reach me on Twitter <b><a className="text-blue-500" href="https://x.com/TgoRoss1">@TgoRoss1</a></b></span>
                <span className="normal-font">Feel free to DM me if you have any questions, feedback, or suggestions!</span>
            </div>

            {/* Notes + Story Section */}
            <div className="w-full flex flex-col items-start justify-center mt-8 gap-1">
                <h3 className="text-4xl font-bold text-[#b43777] brightness-110 [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(180,55,119,0.60)]">
                    Notes
                </h3>
            </div>

            <div className="w-full flex flex-col items-start justify-center border-t border-white mt-2">
                <span className="normal-font pt-1">I originally started this project as a simple guessing game.</span>
                <span className="normal-font">But as development went on, I got more and more excited and started adding new features.</span>
                <span className="normal-font">I haven't been able to include everything I had planned yet, but I'm really proud of what I've accomplished so far.</span>
                <span className="normal-font">I plan to continue working on this project and adding new updates soon.</span>

                {/*Next steps */}
                <div className="w-full flex flex-col">
                    <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                        Next Steps
                    </h4>
                    <span className="normal-font pt-1">Here's what I'm planning to add in the future:</span>
                    <div className="w-full flex flex-col items-start justify-center">
                        <span className="normal-font pt-2">⬜ Implement a <b>dedicated page</b> for idols.</span>
                        <span className="normal-font">⬜ Add <b>more</b> K-pop groups and idols.</span>
                        <span className="normal-font">⬜ Implement a new <b>game mode</b> — Guess an idol by their <b>blurred facecard</b>.</span>
                        <span className="normal-font">⬜ And <b>more!</b></span>
                    </div>
                </div>

                {/* Used Technologies */}
                <div className="w-full flex flex-col">
                    <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                        Technologies Used
                    </h4>
                    <div className="w-full flex flex-col items-start justify-center">
                        <span className="normal-font pt-1">🟪 Frontend: <b>React</b> + <b>Vite</b> and <b>Typescript</b>.</span>
                        <span className="normal-font">🟦 Backend: <b>Python</b> + <b>Flask</b>.</span>
                        <span className="normal-font">🟨 Database: <b>SQLite</b>.</span>
                    </div>
                </div>

                {/* Final Thoughts */}
                <div className="w-full flex flex-col">
                    <h4 className="text-2xl pt-2 font-bold text-[#ce757a] [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(206,117,122,0.60)] brightness-110">
                        Final Thoughts
                    </h4>
                    <div className="w-full flex flex-col items-start justify-center">
                        <span className="normal-font pt-1">I'm really proud of this project and the progress I've made so far.</span>
                        <span className="normal-font">I've learned a lot more about <b>web development</b> and <b>K-pop</b>.</span>
                        <span className="normal-font">As I said before, my plan is to keep improving this project and adding new features whenever I can.</span>
                        <span className="normal-font">I'm excited to see this project evolve and grow in the future.</span>
                        <span className="normal-font">I hope you enjoy playing it as much as I enjoyed making it!</span>
                    </div>

                    <div className="w-full flex flex-col items-center justify-center mt-6">
                        <span className="xxs:text-lg xs:text-xl font-semibold">Thank you for playing Kpopdle! 💜</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AboutText;