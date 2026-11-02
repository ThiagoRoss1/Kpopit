import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import PageShell from "../../components/PageShell/PageShell";
import { PressButton } from "../../components/buttons/PressButton";
import PageLoader from "../../components/Loading/PageLoader";
import PageMeta from "../../components/Seo/PageMeta";
import { useAuth } from "../../hooks/useAuth";
import { useHydrated } from "../../hooks/useHydrated";
import { useSharedGameData } from "../../hooks/useSharedGameData";
import { getIdolXpState } from "../../services/api";
import { cn } from "../../lib/utils";
import type { IdolXpState } from "../../interfaces/playerInterfaces";
import PuffCard from "./PuffCard";
import PotionJar from "./PotionJar";
import XpMemberView from "./XpMemberView";
import { RulesRow } from "./XpParts";
import { useFilled } from "./useFilled";
import "./idolXp.css";

const IdolXP = () => {
    const hydrated = useHydrated();
    const { isAuthenticated: isMember, isLoading, user } = useAuth();
    const { allIdolsData, isInitialized } = useSharedGameData();

    const stateKey = ["idolXpState", isMember ? user?.user_credentials.user_id : "guest"];
    const state = useQuery({
        queryKey: stateKey,
        queryFn: () => getIdolXpState(!isMember),
        enabled: hydrated && !isLoading && (isMember || isInitialized),
    });
    const isReady = hydrated && !isLoading && state.data && (!isMember || allIdolsData);

    return (
        <PageShell
            width="max-w-270"
            header={{
                title: "Idol XP",
                korean: "아이돌 레벨",
                subtitle: isMember ? "Pick who your wins level up..." : "Every game you finish fills your potion. Sign up to level up an idol.",
            }}
        >
            <PageMeta
                title="Idol XP · KpopIt"
                description="Level up your favourite K-pop idols with the games you finish on KpopIt."
                path="/idol-xp"
                noindex
            />

            {!isReady ? (
                <PageLoader error={state.isError} onRetry={() => state.refetch()} />
            ) : isMember ? (
                <XpMemberView
                    state={state.data as IdolXpState}
                    stateKey={stateKey}
                    idols={allIdolsData ?? []}
                    username={user?.user_credentials.username ?? ""}
                />
            ) : (
                <GuestView potion={state.data!.potion} />
            )}
        </PageShell>
    );
};

/** Guests see their potion filling up and the way to sign up. */
const GuestView = ({ potion }: { potion: IdolXpState["potion"] }) => {
    const navigate = useNavigate();
    const filled = useFilled();

    return (
        <div className="flex flex-col gap-6.5 mt-8.5">
            <PuffCard
                className={cn(
                    "pp-enter [--pp-delay:140ms] grid grid-cols-[240px_minmax(0,1fr)] @max-[761px]:grid-cols-1 items-center gap-9 @max-[761px]:gap-6",
                    "px-10 @max-[761px]:px-5 py-8.5 @max-[761px]:py-6",
                )}
            >
                <div className="flex flex-col items-center gap-4">
                    <PotionJar fill={filled ? potion.xp / potion.cap : 0} className="block w-32.5 h-auto" />

                    <span className="px-3 py-1.25 rounded-full -rotate-2 border-2 border-[#1A1418] bg-[#FFE3F1] shadow-[2px_3px_0_#1A1418] font-bold text-[13px] text-[#1A1418]">
                        {potion.xp} / {potion.cap} XP
                    </span>
                </div>

                <div className="flex flex-col items-start @max-[761px]:items-center gap-3 @max-[761px]:text-center">
                    <span className="font-semibold text-[11px] tracking-[.14em] text-(--group)">YOUR POTION</span>
                    <h2 className="m-0 font-bold text-[30px] leading-[1.15] text-balance">Your potion is filling up...</h2>

                    <p className="m-0 text-[15.5px] leading-[1.6] text-(--muted) text-pretty">
                        Every game you finish adds XP to it, even as a guest. Create an account to pick an idol and pour your potion into them.
                    </p>

                    <div className="flex flex-wrap gap-2.5 mt-1">
                        <PressButton variant="cta" className="h-11.5 px-5.5 text-[15px] tracking-[.01em] [--ctl-off:var(--ink)]" onClick={() => navigate("/register")}>
                            Create account
                        </PressButton>
                        <PressButton className="h-11.5 px-5 text-[15px]" onClick={() => navigate("/login")}>Log in</PressButton>
                    </div>

                    <span className="font-medium text-[13px] text-(--muted)">Your potion comes with you when you sign up.</span>
                </div>
            </PuffCard>

            <RulesRow />
        </div>
    );
};

export default IdolXP;
