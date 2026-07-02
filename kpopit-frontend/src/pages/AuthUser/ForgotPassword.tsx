import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useMutation } from "@tanstack/react-query";
import { Mail, CheckCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { forgotPassword, authError } from "../../services/api";
import AuthBackground from "./AuthBackground";
import { Helmet } from "react-helmet-async";
import "./authPage.css";

const ForgotPassword = () => {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: (target: string) => forgotPassword(target),
        onSuccess: () => {
            setError(null);
            setSubmitted(true);
        },
        onError: (err: unknown) => {
            if (authError(err)) {
                setError(err.response.data.error);
            } else {
                setError("Something went wrong. Please try again.");
            }
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError("Email is required");
            return;
        }
        setError(null);
        mutation.mutate(email.trim());
    };

    if (!isAuthLoading && isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return (
        <>
            <Helmet>
                <title>KpopIt - Forgot Password</title>
                <meta name="robots" content="noindex" />
            </Helmet>
            
            <AuthBackground />
            <div className="relative flex flex-col items-center justify-center min-h-full w-full">
                <div className="relative z-10 flex flex-col items-center justify-center w-full px-2 sxs:px-3 sm:px-4 pt-15 pb-8">
                    <div className="relative w-full max-w-120">
                        <div className="absolute inset-0 z-0 bg-ink border border-solid border-neon-pink/15 rounded-[40px] modal-outer-shadow translate-x-0.75 translate-y-0.75 rotate-[1.5deg] transform-gpu" />

                        <div className="relative z-10 flex flex-col bg-[#111111] border-4 border-neon-pink rounded-[40px] p-5 sxs:p-6 sm:p-8 modal-inner-shadow">

                            <div className="mb-6 text-center">
                                <h1 className="flex flex-col text-4xl sxs:text-[42px] font-sans font-black uppercase leading-tight">
                                    <span className="text-white">Forgot your</span>
                                    <span className="text-neon-pink">Password?</span>
                                </h1>
                                <span className="flex justify-center items-center mt-3 text-sm text-white/40 font-black uppercase tracking-[0.15em]">
                                    {submitted ? "Check your inbox" : "We'll send you a link"}
                                </span>
                            </div>

                            {submitted ? (
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col items-center gap-3 px-2 py-1 text-center">
                                        <CheckCircle className="w-12 h-12 text-neon-pink" />
                                        <span className="text-sm text-white/80 font-bold leading-relaxed">
                                            If an account with that email exists, a reset link has been sent.
                                        </span>
                                        <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest">
                                            The link expires in 1 hour
                                        </p>
                                    </div>

                                    <Link
                                        to="/login"
                                        className="flex items-center justify-center w-full h-16 font-sans italic gap-1.5 bg-neon-pink 
                                        rounded-2xl shadow-[4px_4px_0px_rgba(255,255,255,1)] text-center text-lg text-white font-black 
                                        [text-shadow:2px_2px_4px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 
                                        hover:shadow-[0px_0px_0px_rgba(0,0,0,0)] hover:cursor-pointer transition-all duration-200 transform-gpu center-stage-btn"
                                    >
                                        Back to Login
                                    </Link>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                                    <div className="flex flex-col gap-2 pb-1">
                                        <label className="pl-1 text-[12px] text-white/90 font-black uppercase tracking-[0.15em]">
                                            Email Address
                                        </label>
                                        
                                        <div className="neo-input-modal relative h-14 rounded-2xl overflow-hidden">
                                            <Mail
                                                className={`absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 transform-gpu transition-colors duration-200 ${email.length > 0 ? "text-white" : "text-neutral-600"}`}
                                            />
                                            <input
                                                type="email"
                                                name="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="bias@example.com"
                                                autoComplete="email"
                                                className="w-full h-full pl-11 pr-4 bg-ink text-sm font-bold text-white placeholder:text-neutral-700 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {error && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="text-center text-xs text-red-400 font-bold transform-gpu"
                                            >
                                                {error}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        type="submit"
                                        disabled={mutation.isPending}
                                        className={`flex items-center justify-center w-full h-16 font-sans italic gap-1.5 
                                        bg-neon-pink rounded-2xl shadow-[4px_4px_0px_rgba(255,255,255,1)] text-center text-lg text-white 
                                        font-black [text-shadow:2px_2px_4px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 
                                        hover:shadow-[0px_0px_0px_rgba(0,0,0,0)] hover:cursor-pointer transition-all duration-200 transform-gpu 
                                        center-stage-btn ${mutation.isPending ? "opacity-70" : ""}`}
                                    >
                                        {mutation.isPending ? "Sending..." : "Send Reset Link"}
                                    </button>

                                    <div className="pt-4 border-t border-white/5 text-center">
                                        <p className="text-[12px] text-white/60 font-bold uppercase tracking-widest">
                                            Remember your password?{" "}
                                            <Link
                                                to="/login"
                                                className="ml-1 text-neon-pink font-black decoration-2 underline-offset-4 hover:underline transition-all"
                                            >
                                                Sign In
                                            </Link>
                                        </p>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ForgotPassword;
