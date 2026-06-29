import "./authPage.css";

const AuthBackground = () => {
    return (
        <div className="noise-bg fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-ink">

            <div className="absolute inset-0 flex items-center justify-center overflow-hidden select-none">
                <span className="whitespace-nowrap text-white font-korean text-[600px] font-black leading-none tracking-tighter opacity-[0.06] rotate-[-15deg]">
                    케이팝잇
                </span>
            </div>

            {/* Corner circles */}
            <div className="absolute -top-20 -left-20 w-80 h-80 border-2 border-neon-pink rounded-full opacity-20" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 border-2 border-neon-pink rounded-full opacity-10" />
            <div className="absolute top-10 -right-10 w-32 h-32 border-2 border-neon-pink rounded-full opacity-10" />
            <div className="absolute -bottom-10 -right-16 w-72 h-72 border-2 border-neon-pink rounded-full opacity-[0.07]" />
        </div>
    );
};

export default AuthBackground;
