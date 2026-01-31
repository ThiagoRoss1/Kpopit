import "./home.css";
import "../../index.css";
import { Link } from "react-router-dom";
import { useState } from "react";
import BackgroundStyle from "../../components/Background/BackgroundStyle";
import InfoButtons from "../../components/buttons/InfoButtons";
import Modal from "../../components/buttons/modals/Modal";
import ChangelogText from "../../components/buttons/modals/ChangelogContent";
import AboutText from "../../components/buttons/modals/AboutContent";

function Home() {

    const [showModal, setShowModal] = useState<null | "changelog" | "about">(null);
    return (
        <>
        <BackgroundStyle />
            <div className="min-h-full w-full flex flex-col items-center justify-start">
                <div className="flex flex-col items-center justify-center sm:h-32.5 sm:w-77.5 sm:mt-25 sm:mb-10 gap-0">
                    <Link
                        to="/"
                        className="inline-block bg-transparent border-0 p-0 cursor-pointer
                        hover:scale-105 transition-all duration-500 transform-gpu"
                        draggable={false}>
                            <h1 className="leading-tight sm:text-[80px] font-bold text-center
                            text-white">
                                <span className="kpop-part">Kpop</span>
                                <span className="it-part">it</span>
                            </h1>
                    </Link>

                    <span className="text-white text-2xl [text-shadow:2px_2px_0px_rgba(0,0,0,1),0_0_12px_rgba(255,255,255,0.40)]">
                        Pick a game and have fun!
                    </span>
                </div>
                
                <div className="flex w-fit h-fit items-center justify-center sm:mb-15">
                    <InfoButtons
                        onSubmitChangelog={() => {setShowModal("changelog")}}
                        onSubmitAbout={() => {setShowModal("about")}}
                    />

                    {showModal === "changelog" && <Modal isOpen onClose={() => setShowModal(null)} title="Changelog..." isAboutOrChangelog={true}><ChangelogText /></Modal>}
                    {showModal === "about" && <Modal isOpen onClose={() => setShowModal(null)} title="About..." isAboutOrChangelog={true}><AboutText /></Modal>}

                </div>

                {/* Games */}
                <div className="flex flex-col items-center justify-center w-fit h-fit sm:mb-25">
                    <div className="w-full h-fit flex flex-col bg-transparent items-center justify-center sm:gap-10">
                        {/* Classic */}
                        <div 
                            className="flex w-117.5 h-25 px-2 bg-black border border-white rounded-3xl
                            items-center justify-start gap-2 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[0px_0px_0px_0px_rgba(255,255,255,1)]
                            hover:translate-x-1 hover:translate-y-1 transition-all duration-200 transform-gpu">
                            <div className="flex w-20 h-20 bg-white/0 rounded-full items-center text-center justify-center">
                                <img
                                    src="/public/kpopit-icon.png"
                                    alt="Kpopit Icon"
                                    className="sm:w-12 sm:h-12"
                                    draggable={false} />
                            </div>

                            <div className="flex-1 flex flex-row items-center justify-center gap-6">
                                <div 
                                    className="flex-1 flex flex-col items-start justify-center gap-0.5">
                                    <div className="flex items-center justify-center text-center border-b border-[#e70a7d] gap-0">
                                        <h2 className="text-[#e70a7d] brightness-110 [text-shadow:2px_2px_0px_rgba(0,0,0,1),0_0_12px_rgba(231,10,125,0.60)] text-2xl font-bold">
                                            Classic
                                        </h2>
                                    </div>

                                    <span className="text-white text-base
                                    [text-shadow:2px_2px_0px_rgba(0,0,0,1),0_0_12px_rgba(255,255,255,0.60)]">
                                        Guess the daily K-pop idol based on clues
                                    </span>
                                </div>
                                
                                <Link
                                    to="/classic"
                                    className="flex sm:w-22.5 sm:h-15 bg-transparent border border-white 
                                    rounded-2xl text-white items-center justify-center text-center
                                    hover:scale-105 hover:bg-[#e70a7d]
                                    transition-all duration-500 transform-gpu mr-3.5"
                                    draggable={false}>
                                        Play
                                </Link>
                            </div>
                        </div>

                        {/* Blurry */}
                        <div 
                            className="flex w-117.5 h-25 px-2 bg-black border border-white rounded-3xl
                            items-center justify-start gap-2 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[0px_0px_0px_0px_rgba(255,255,255,1)]
                            hover:translate-x-1 hover:translate-y-1 transition-all duration-200 transform-gpu">
                            <div className="flex w-20 h-20 bg-white/0 rounded-full items-center text-center justify-center">
                                <img
                                    src="/public/kpopit-icon.png"
                                    alt="Kpopit Icon"
                                    className="sm:w-12 sm:h-12 sm:blur-[2px]"
                                    draggable={false} />
                            </div>

                            <div className="flex-1 flex flex-row items-center justify-center gap-6">
                                <div 
                                    className="flex-1 flex flex-col items-start justify-center gap-0.5">
                                    <div className="flex items-center justify-center text-center border-b border-[#e70a7d] gap-0">
                                        <h2 className="text-[#e70a7d] brightness-110 [text-shadow:2px_2px_0px_rgba(0,0,0,1),0_0_12px_rgba(231,10,125,0.60)] text-2xl font-bold">
                                            Blurry
                                        </h2>
                                    </div>

                                    <span className="text-white text-base
                                    [text-shadow:2px_2px_0px_rgba(0,0,0,1),0_0_12px_rgba(255,255,255,0.60)]">
                                        Guess the daily K-pop blurry image
                                    </span>
                                </div>
                                
                                <Link
                                    to="/blurry"
                                    className="flex sm:w-22.5 sm:h-15 bg-transparent border border-white 
                                    rounded-2xl text-white items-center justify-center text-center
                                    hover:scale-105 hover:bg-[#e70a7d]
                                    transition-all duration-500 transform-gpu mr-3.5"
                                    draggable={false}>
                                        Play
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex h-fit w-fit items-center justify-center text-center">
                    <span className="text-white text-lg font-bold brightness-110 [text-shadow:2px_2px_0px_rgba(0,0,0,1)]">
                        Made with ❤️ for K-pop fans
                    </span>
                </div>
            </div>
        </>
    )
}

export default Home;