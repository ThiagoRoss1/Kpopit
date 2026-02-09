import "./PrivacyPolicy.css";
import BackgroundStyle from "../../components/Background/BackgroundStyle";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
    return (
        <>
        <BackgroundStyle />
        <div className="w-full h-full flex items-start justify-center">
            <div className="flex flex-col items-center justify-center">
                <div className="w-full sm:w-full max-h-fit bg-white overflow-hidden rounded-4xl shadow-[0px_2px_10px_4px_rgba(255,255,255,0.5)]
                mx-auto mt-20 mb-10">
                    <div className="flex flex-col items-center justify-center w-full h-10 mt-10">
                        <h1 className="xxs:text-2xl xm:text-3xl sm:text-3xl font-bold">Kpopit - Privacy Policy</h1>
                    </div>

                    {/* Last Updated */}
                    <div className="items-start justify-center mt-8">
                        <span className="text-lg px-8"><b>Last Updated:</b> November 25, 2025</span>
                    </div>

                    {/* Section 1 - Introduction / What Information We Collect */}
                    <div className="flex flex-col items-start justify-center px-8">
                        <div className="flex flex-col items-start justify-center mt-8 gap-3">
                            <h2 className="text-2xl font-bold">1. Information We Collect</h2>

                            <span className="text-base font-semibold">We currently collect the following types of information from our users:</span>
                        </div>

                        <div className="flex flex-col items-start justify-center mt-3">
                            <h3 className="text-xl font-bold">1.1. User Token</h3>
                            <ul className="list-disc pl-6">
                                <li className="text-base mt-1">A unique random ID assigned to each user to save their game progress and preferences</li>
                                <li className="text-base">This token is encrypted and stored locally on the user's device</li>
                                <li className="text-base">The token is sent to the server only to load the user's game progress and preferences</li>
                            </ul>

                            <h3 className="text-xl font-bold mt-3">1.2. Game Data</h3>
                            <ul className="list-disc pl-6">
                                <li className="text-base mt-1">We storage your guesses, wins, streaks</li>
                                <li className="text-base">This data can be transferred between devices by using a transfer code</li>
                            </ul>

                            <span className="text-base mt-3">⚠ We do not collect any personally identifiable information from our users</span>
                        </div>
                    </div>

                    {/* Section 2 - Cookies and Tracking */}
                    <div  className="flex flex-col items-start justify-center px-8">
                        <div className="flex flex-col items-start justify-center mt-8 gap-3">
                            <h2 className="text-2xl font-bold">2. Cookies and Tracking</h2>

                            <span className="text-base font-semibold">We currently do not use cookies.</span>

                            <span className="text-base font-semibold">In the future, we may add optional cookies for:</span>
                            
                        </div>

                        <div className="flex flex-col items-start justify-center">
                            <ul className="list-disc pl-6">
                                <li className="text-base mt-1">User preferences</li>
                                <li className="text-base">Analytics to improve the game</li>
                            </ul>

                            <span className="text-base mt-3">⚠ If that happens, this Privacy Policy will be updated accordingly to inform our users.</span>
                        </div>
                    </div>

                    {/* Section 3 - How We Use Your Data */}
                    <div className="flex flex-col items-start justify-center px-8">
                        <div className="flex flex-col items-start justify-center mt-8 gap-3">
                            <h2 className="text-2xl font-bold">3. How We Use Your Data</h2>

                            <span className="text-base font-semibold">We use the collected data for the following purposes.</span>
                        </div>

                        <div className="flex flex-col items-start justify-center">
                            <ul className="list-disc pl-6">
                                <li className="text-base mt-1">Save your game progress</li>
                                <li className="text-base">Calculate your ranking</li>
                                <li className="text-base">Ensure fair play</li>
                                <li className="text-base">Improve the user experience</li>
                                <li className="text-base">Let users share and transfer their progress</li>
                            </ul>
                        </div>

                        <span className="text-base font-semibold mt-3">We do not:</span>

                        <div className="flex flex-col items-start justify-center">
                            <ul className="list-disc pl-6">
                                <li className="text-base mt-1">Sell your data</li>
                                <li className="text-base">Share your data with third parties</li>
                                <li className="text-base">Track your activity outside the game</li>
                            </ul>
                        </div>
                    </div>

                    {/* Section 4 - Data Storage */}
                    <div className="flex flex-col items-start justify-center px-8">
                        <div className="flex flex-col items-start justify-center mt-8 gap-3">
                            <h2 className="text-2xl font-bold">4. Data Storage</h2> 
                        </div>

                        <div className="flex flex-col items-start justify-center">
                            <ul className="list-disc pl-6">
                                <li className="text-base mt-1">Game data is stored on our backend database</li>
                                <li className="text-base">Tokens are stored only on your device</li>
                                <li className="text-base">Data is kept only as long as necessary for the game to function</li>
                            </ul>
                        </div>
                    </div>

                    {/* Section 5 - Your Rights */}
                    <div className="flex flex-col items-start justify-center px-8">
                        <div className="flex flex-col items-start justify-center mt-8 gap-3">
                            <h2 className="text-2xl font-bold">5. Your Rights</h2>

                            <span className="text-base font-semibold">All users have the right to:</span>
                        </div>

                        <div className="flex flex-col items-start justify-center">
                            <ul className="list-disc pl-6">
                                <li className="text-base mt-1">Request access to their data</li>
                                <li className="text-base">Request deletion of their data</li>
                                <li className="text-base">Opt out of data collection and advertising</li>
                            </ul>
                        </div>
                    </div>

                    {/* Section 6 - Changes to This Privacy Policy */}
                    <div className="flex flex-col items-start justify-center px-8">
                        <div className="flex flex-col items-start justify-center mt-8 gap-3">
                            <h2 className="text-2xl font-bold">6. Changes to This Privacy Policy</h2>

                            <span className="text-base font-semibold">We may update this privacy policy as the project evolves.</span>
                        </div>
                    </div>

                    {/* Section 7 - Contact Us */}
                    <div className="flex flex-col items-start justify-center px-8 mb-10">
                        <div className="flex flex-col items-start justify-center mt-8 gap-3 mb-8">
                            <h2 className="text-2xl font-bold">7. Contact Us</h2>

                            <span className="text-base font-semibold">If you have questions or concerns about this Privacy Policy, you can contact us at:</span>

                            <div className="flex flex-row items-start justify-center gap-2">
                                <span className="text-base"><a href="https://github.com/ThiagoRoss1" className="text-blue-500">Github</a></span>
                                <span className="text-base">|</span>
                                <span className="text-base"><a href="https://x.com/TgoRoss1" className="text-blue-500">Twitter/X</a></span>
                            </div>
                        </div>
                    </div>
                </div>

                <span className="text-base mb-2">
                    <span className="text-base text-white">You can go back to the game </span>
                    <Link to="/">
                        <span className="text-base text-blue-500 underline hover:text-blue-600">here</span>
                    </Link>
                </span>
            </div>
        </div>

        </>
    )
}

export default PrivacyPolicy;