const MaintenanceDatabase = () => {
    const HANNI_GIF = "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2g1dHU4Njk1eXN5aGYzZWpnaGJ4bWVleGNwcHBucTNmdDA1YnN3MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IShxz9vFSpUSR30gH0/giphy.gif";
    const HAERIN_GIF = "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2ttaGFkbGN5cnhuNTBqZTYxMWo1MDQ0dm1vZmF3OTZvNXRwdHJ0YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/8bJD3Nxiu7DqfF7c5M/giphy.gif";

    return (
        <div className="w-full h-fit flex flex-col justify-center items-center mt-6 gap-4 sm:mt-16 sm:gap-10">
            <div className="w-fit h-fit flex flex-col gap-2 justify-center items-center animate-pulse text-white [text-shadow:2px_2px_8px_rgba(0,0,0,0.5)]">
                <h1 className="text-2xl sm:text-4xl font-bold">
                    Hi, lol
                </h1>
                <span className="text-lg sm:text-3xl font-semibold">
                    Kpopit is currently under maintenance.
                </span>
            </div>

            <div className="flex justify-center items-center">
                <img src={HANNI_GIF} alt="Hanni Gif" className="w-40 h-40 sm:w-60 sm:h-60" />
            </div>

            <div className="w-fit h-fit flex flex-col gap-6 justify-center items-center">
                <div className="flex flex-col gap-2 justify-center items-center">
                    <span className="text-[14px] sm:text-xl font-semibold text-white [text-shadow:2px_2px_8px_rgba(0,0,0,0.5)]">
                        Update: I'm currently working on Kpopit's database!
                    </span>

                    <span className="text-[14px] sm:text-xl font-semibold text-white [text-shadow:2px_2px_8px_rgba(0,0,0,0.5)]">
                        This maintenance / update is expected to be completed soon (20 minutes from Midnight EST).
                    </span>
                </div>
                
                <div className="flex flex-col gap-2 justify-center items-center">
                    <span className="text-base sm:text-2xl font-semibold text-[#FF3399] [text-shadow:2px_2px_8px_rgba(0,0,0,0.5)]">
                        What I'm doing: I'm changing Kpopit's database from SQLite to PostgreSQL.
                    </span>
                    
                    <span className="text-base sm:text-2xl font-semibold text-[#FF3399] [text-shadow:2px_2px_8px_rgba(0,0,0,0.5)]">
                        Why: SQLite is faster than PostgreSQL Buuuut there are some features in PostgreSQL that makes it more suitable for Kpopit's future.
                    </span>
                </div>
                
                <div className="flex flex-col justify-center items-center">
                    <span className="text-[14px] sm:text-xl font-semibold text-white [text-shadow:2px_2px_8px_rgba(0,0,0,0.5)]">
                        Examples:
                    </span>
                    
                    <ul className="list-disc list-inside text-center">
                        <li className="text-[14px] sm:text-xl font-semibold text-white [text-shadow:2px_2px_8px_rgba(0,0,0,0.5)]">
                            Backup (makes me more comfortable)
                        </li>

                        <li className="text-[14px] sm:text-xl font-semibold text-white [text-shadow:2px_2px_8px_rgba(0,0,0,0.5)]">
                            PostgreSQL is more scalable and can handle larger amounts of data / requests
                        </li>

                        <li className="text-[14px] sm:text-xl font-semibold text-white [text-shadow:2px_2px_8px_rgba(0,0,0,0.5)]">
                            Cloud Database Hosting: I can change Kpopit's database infos like idols names from a dashboard in any place / device.
                        </li>
                        
                        <li className="text-[14px] sm:text-xl font-semibold text-white [text-shadow:2px_2px_8px_rgba(0,0,0,0.5)]">
                            Will be easier to implement new features in the future (like user accounts, statistics, etc.)
                        </li>
                    </ul>
                </div>

                <div className="flex flex-col gap-2 justify-center items-center">
                    <span className="text-[14px] sm:text-xl font-semibold text-[#FF3399] [text-shadow:2px_2px_8px_rgba(0,0,0,0.5)]">
                        There are many other reasons but I'll not enter into technical details, just know that this will benefit Kpopit in the long run.
                    </span>

                    <span className="text-lg sm:text-3xl font-semibold text-[#FF3399] [text-shadow:2px_2px_8px_rgba(0,0,0,0.5)]">
                        We will be back soon!
                    </span>
                </div>

                <div className="flex justify-center items-center mb-6 sm:mb-10">
                    <img src={HAERIN_GIF} alt="Haerin Gif" className="w-60 h-60 sm:w-80 sm:h-80"/>
                </div>               
            </div>
        </div>
    )
}

export default MaintenanceDatabase;