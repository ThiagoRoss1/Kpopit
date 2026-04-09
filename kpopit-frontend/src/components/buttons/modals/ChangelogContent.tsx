const ChangelogText = () => {

    const divClass = `flex flex-col justify-center items-center max-xxs:w-70 xxs:w-80 sm:w-100 gap-3 rounded-lg p-4
            shadow-[0_0_10px_2px_rgba(255,255,255,0.15),0_0_10px_2px_rgba(255,255,255,0.15)] wrap-break-word text-center`;

    const textClass = "text-white text-lg [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_12px_rgba(255,255,255,0.40)]";
    return (
        <div className="w-full bg-transparent mt-5 mb-5">
            <div className="w-full flex flex-col justify-center items-center gap-y-4">

                {/* Changelog 4 */}
                <div className={`${divClass} bg-gray-900 border-2 border-white`}>
                    <h3 className={textClass}>April 08, 2026</h3>
                        <p className={`${textClass} text-center`}>
                            New Feature: Idols Page and Profiles
                        </p>
                        <p className={`${textClass} text-center`}>
                            Added a dedicated page for idols with detailed information, including career, personal profiles and more.
                        </p>
                </div>

                {/* Changelog 3 */}
                <div className={`${divClass} bg-gray-900 border-2 border-white`}>
                    <h3 className={textClass}>March 27, 2026</h3>
                        <p className={`${textClass} text-center`}>
                            Database Changed {`->`} PostgreSQL:
                        </p>
                        <p className={textClass}>
                            Migrated from SQLite to PostgreSQL for better performance and long-term scalability.
                        </p>
                </div>

                {/* Changelog 2 */}
                <div className={`${divClass}  bg-gray-900 border-2 border-white`}>
                    <h3 className={textClass}>February 09, 2026</h3>
                        <p className={`${textClass} text-center`}>
                            New Game mode: Blurry
                        </p>
                        <p className={`${textClass} text-center`}>
                            Interface and Optimization Updates
                        </p>
                </div>

                {/* Changelog 1 */}
                <div className={`${divClass} bg-gray-900 border-2 border-white`}>
                    <h3 className={textClass}>December 26, 2025</h3>
                        <p className={`${textClass} text-center`}>Game Launch!</p>
                </div>
            </div>
        </div>
    )
}

export default ChangelogText;