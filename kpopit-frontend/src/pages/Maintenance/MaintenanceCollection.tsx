import { Clock, Sparkles, ShieldCheck, Layers, RefreshCw } from "lucide-react";

const MaintenanceCollection = () => {
    const HANNI_GIF = "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2g1dHU4Njk1eXN5aGYzZWpnaGJ4bWVleGNwcHBucTNmdDA1YnN3MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IShxz9vFSpUSR30gH0/giphy.gif";
    const HAERIN_GIF = "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2ttaGFkbGN5cnhuNTBqZTYxMWo1MDQ0dm1vZmF3OTZvNXRwdHJ0YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/8bJD3Nxiu7DqfF7c5M/giphy.gif";

    const faqs = [
        {
            icon: <ShieldCheck className="w-5 h-5 text-neon-pink shrink-0" />,
            q: "Will I lose my stats or streaks?",
            a: "No. Nothing gets deleted — we're only adding. Every guess, streak and daily record stays exactly where it is.",
        },
        {
            icon: <Sparkles className="w-5 h-5 text-neon-pink shrink-0" />,
            q: "What do I actually get?",
            a: "A collectible card for every idol you've already guessed right in Classic or Blurry. Win the same idol again and the card levels up.",
        },
        {
            icon: <RefreshCw className="w-5 h-5 text-neon-pink shrink-0" />,
            q: "Do I need to do anything?",
            a: "Nope. Just come back and refresh in a few minutes — your album will be waiting, already filled in.",
        },
    ];

    return (
        <div className="w-full max-w-2xl h-fit flex flex-col items-center gap-8 py-10 sm:py-16">
            {/* Header */}
            <div className="flex flex-col items-center gap-3 text-center">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-neon-pink/90">
                    KpopIt · <span className="font-korean">케이팝잇</span> Collections
                </span>

                <h1 className="text-3xl sm:text-5xl font-bold text-white [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8),0_0_4px_rgba(180,55,119,0.45)]">
                    Building your album 📸
                </h1>

                <p className="max-w-md text-sm sm:text-lg font-medium text-gray-300 leading-relaxed">
                    KpopIt is launching <span className="text-white font-semibold">Collections</span> — a sticker album that turns your daily wins into cards you can keep.
                </p>
            </div>

            {/* ETA pill */}
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#111111] border-2 border-neon-pink shadow-[4px_4px_0px_rgba(255,51,153,0.25)]">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-neon-pink opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-neon-pink" />
                </span>
                <Clock className="w-4 h-4 text-white" />
                <span className="text-sm sm:text-base font-semibold text-white">
                    Back in ~10–20 minutes
                </span>
            </div>

            {/* Polaroid gifs — retro-pop tilt + offset shadow */}
            <div className="flex items-center justify-center gap-4 sm:gap-6">
                <figure className="rotate-[-4deg] hover:rotate-0 transition-transform duration-300 bg-[#f5f5f5] p-2 pb-6 rounded-md border-2 border-[#2a2a2a] shadow-[6px_6px_0px_rgba(0,0,0,0.5)]">
                    <img
                        src={HANNI_GIF}
                        alt="Hanni"
                        className="w-28 h-28 sm:w-40 sm:h-40 object-cover rounded-sm"
                    />
                    <figcaption className="mt-1.5 text-center text-[11px] sm:text-sm font-semibold text-[#111111]">
                        sorting cards…
                    </figcaption>
                </figure>

                <figure className="rotate-[4deg] hover:rotate-0 transition-transform duration-300 bg-[#f5f5f5] p-2 pb-6 rounded-md border-2 border-[#2a2a2a] shadow-[6px_6px_0px_rgba(255,51,153,0.35)]">
                    <img
                        src={HAERIN_GIF}
                        alt="Haerin"
                        className="w-28 h-28 sm:w-40 sm:h-40 object-cover rounded-sm"
                    />
                    <figcaption className="mt-1.5 text-center text-[11px] sm:text-sm font-semibold text-[#111111]">
                        almost done!
                    </figcaption>
                </figure>
            </div>

            {/* What's happening */}
            <div className="w-full text-left flex flex-col gap-3 p-5 sm:p-6 rounded-2xl bg-[#111111] border-2 border-[#2a2a2a] shadow-[6px_6px_0px_rgba(255,51,153,0.15)]">
                <div className="flex items-center gap-2.5">
                    <Layers className="w-5 h-5 text-neon-pink" />
                    <h2 className="text-base sm:text-xl font-bold text-white">
                        What's happening right now
                    </h2>
                </div>
                <p className="text-sm sm:text-base font-medium text-gray-300 leading-relaxed">
                    We're replaying <span className="text-white font-semibold">every past Classic &amp; Blurry win</span> to mint the cards you've already earned. It's a one-time step, so your album starts full instead of empty — that's why the games are paused for a few minutes.
                </p>
            </div>

            {/* FAQ */}
            <div className="w-full flex flex-col gap-3">
                {faqs.map((item) => (
                    <div
                        key={item.q}
                        className="text-left flex flex-col gap-1.5 p-4 sm:p-5 rounded-xl bg-[#111111] border-2 border-[#2a2a2a]"
                    >
                        <div className="flex items-center gap-2.5">
                            {item.icon}
                            <h3 className="text-sm sm:text-lg font-semibold text-white">
                                {item.q}
                            </h3>
                        </div>
                        <p className="pl-7.5 text-[13px] sm:text-base font-medium text-gray-400 leading-relaxed">
                            {item.a}
                        </p>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <p className="text-center text-base sm:text-2xl font-semibold text-neon-pink [text-shadow:1.2px_1.2px_4px_rgba(0,0,0,0.8)]">
                We'll be back soon — thanks for waiting 💗
            </p>
        </div>
    );
};

export default MaintenanceCollection;
