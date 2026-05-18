import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { confirmEmailChange, authError } from "../../services/api";
import AuthBackground from "./AuthBackground";
import { Helmet } from "react-helmet-async";
import "./authPage.css";

type Status = "loading" | "success" | "error";

const ConfirmEmailChange = () => {
    const { isAuthenticated, refreshAuth } = useAuth();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<Status>("loading");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const ranOnce = useRef(false);

    useEffect(() => {
        if (ranOnce.current) return;
        ranOnce.current = true;

        if (!token) {
            setStatus("error");
            setErrorMessage("Invalid confirmation link.");
            return;
        }

        const run = async () => {
            try {
                await confirmEmailChange(token);
                if (isAuthenticated) await refreshAuth();
                setStatus("success");
            } catch (err: unknown) {
                setErrorMessage(authError(err) ? err.response.data.error : "Something went wrong confirming your email change.");
                setStatus("error");
            }
        };

        run();
    }, [token, isAuthenticated, refreshAuth]);

    return (
        <>
            <Helmet>
                <title>KpopIt - Confirm Email Change</title>
                <meta name="robots" content="noindex" />
            </Helmet>

            <AuthBackground />
            <div className="relative flex flex-col items-center justify-center min-h-full w-full">
                <div className="relative z-10 flex flex-col items-center justify-center w-full px-2 sxs:px-3 sm:px-4 pt-15 pb-8">
                    <div className="relative w-full max-w-120">
                        <div className="absolute inset-0 z-0 bg-[#0a0a0a] border border-solid border-neon-pink/15 rounded-[40px] modal-outer-shadow translate-x-0.75 translate-y-0.75 rotate-[1.5deg] transform-gpu" />

                        <div className="relative z-10 flex flex-col bg-[#111111] border-4 border-neon-pink rounded-[40px] p-5 sxs:p-6 sm:p-8 modal-inner-shadow">

                            <div className="mb-1 text-center">
                                <h1 className="flex flex-col text-4xl sxs:text-5xl font-sans font-black uppercase leading-tight">
                                    <span className="text-white">Email</span>
                                    <span className="text-neon-pink">
                                        {status === "loading" && "Confirming..."}
                                        {status === "success" && "Updated!"}
                                        {status === "error" && "Not Updated."}
                                    </span>
                                </h1>
                                <p className="mt-3 text-sm text-white/40 font-black uppercase tracking-[0.15em]">
                                    {status === "loading" && "Hold on a sec"}
                                    {status === "success" && "Your email has been changed"}
                                    {status === "error" && "Something's off"}
                                </p>
                            </div>

                            {status === "loading" && (
                                <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
                                    <Loader2 className="w-12 h-12 text-neon-pink animate-spin" />
                                    <p className="text-sm text-white/60 font-bold uppercase tracking-widest">
                                        Confirming your new email
                                    </p>
                                </div>
                            )}

                            {status === "success" && (
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col items-center gap-3 px-2 py-4 text-center">
                                        <CheckCircle className="w-12 h-12 text-neon-pink" />
                                        <p className="text-sm text-white/80 font-bold leading-relaxed">
                                            Your email has been updated. A revert link has been sent to your previous address in case this wasn't you.
                                        </p>
                                    </div> 

                                    <Link
                                        to={isAuthenticated ? "/" : "/login"}
                                        className="flex items-center justify-center w-full h-16 font-sans italic gap-1.5
                                        bg-neon-pink rounded-2xl shadow-[4px_4px_0px_rgba(255,255,255,1)] text-center text-lg text-white
                                        font-black [text-shadow:2px_2px_4px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1
                                        hover:shadow-[0px_0px_0px_rgba(0,0,0,0)] hover:cursor-pointer transition-all duration-200 transform-gpu center-stage-btn"
                                    >
                                        {isAuthenticated ? "Continue" : "Sign In"}
                                    </Link>
                                </div>
                            )}

                            {status === "error" && (
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col items-center gap-3 px-2 py-4 text-center">
                                        <XCircle className="w-12 h-12 text-red-400" />
                                        <p className="text-sm text-white/80 font-bold leading-relaxed">
                                            {errorMessage ?? "We couldn't confirm your email change."}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-white/5 text-center">
                                        <p className="text-[12px] text-white/60 font-bold uppercase tracking-widest">
                                            <Link
                                                to={isAuthenticated ? "/" : "/login"}
                                                className="text-neon-pink font-black decoration-2 underline-offset-4 hover:underline transition-all"
                                            >
                                                {isAuthenticated ? "Back to Home" : "Back to Login"}
                                            </Link>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConfirmEmailChange;
