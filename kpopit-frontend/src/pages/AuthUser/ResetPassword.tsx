import { useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useMutation } from "@tanstack/react-query";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { resetPassword, authError } from "../../services/api";
import AuthBackground from "./AuthBackground";
import "./authPage.css";

function getPasswordStrength(pass: string) {
    if (!pass) return null;
    if (pass.length < 8) return { label: "Weak", color: "#ff4444", width: "33%" };
    const hasLetter = /[a-zA-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);
    if (hasLetter && hasNumber && hasSpecial) return { label: "Strong", color: "#00C851", width: "100%" };
    return { label: "Medium", color: "#ffbb33", width: "66%" };
}

const ResetPassword = () => {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

    const mutation = useMutation({
        mutationFn: (newPassword: string) => resetPassword(token ?? "", newPassword),
        onSuccess: () => {
            setError(null);
            setSuccess(true);
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
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (password.length > 128) {
            setError("Password must be at most 128 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setError(null);
        mutation.mutate(password);
    };

    if (!isAuthLoading && isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (!token) {
        return <Navigate to="/forgot-password" replace />;
    }

    return (
        <>
            <AuthBackground />
            <div className="relative flex flex-col items-center justify-center min-h-full w-full">
                <div className="relative z-10 flex flex-col items-center justify-center w-full px-2 sxs:px-3 sm:px-4 pt-15 pb-8">
                    <div className="relative w-full max-w-120">
                        <div className="absolute inset-0 z-0 bg-[#0a0a0a] border border-solid border-neon-pink/15 rounded-[40px] modal-outer-shadow translate-x-0.75 translate-y-0.75 rotate-[1.5deg] transform-gpu" />

                        <div className="relative z-10 flex flex-col bg-[#111111] border-4 border-neon-pink rounded-[40px] p-5 sxs:p-6 sm:p-8 modal-inner-shadow">

                            <div className="mb-6 text-center">
                                <h1 className="text-4xl sxs:text-5xl font-sans font-black uppercase leading-tight">
                                    <span className="text-white">Reset</span>
                                    <br />
                                    <span className="text-neon-pink">{success ? "Complete." : "Your Password."}</span>
                                </h1>
                                <p className="mt-3 text-[12px] text-white/40 font-black uppercase tracking-[0.5em]">
                                    {success ? "You're all set" : "Pick something memorable"}
                                </p>
                            </div>

                            {success ? (
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col items-center gap-3 px-2 py-4 text-center">
                                        <CheckCircle className="w-12 h-12 text-neon-pink" />
                                        <p className="text-sm text-white/80 font-bold leading-relaxed">
                                            Password reset successfully.
                                        </p>
                                    </div>

                                    <Link
                                        to="/login"
                                        className="flex items-center justify-center w-full h-16 font-sans italic gap-1.5 bg-neon-pink rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] text-center text-lg text-white font-black [text-shadow:2px_2px_4px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[0px_0px_0px_rgba(0,0,0,0)] hover:cursor-pointer transition-all duration-200 transform-gpu center-stage-btn"
                                    >
                                        Sign In
                                    </Link>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                                    <div className="flex flex-col gap-2">
                                        <label className="pl-1 text-[12px] text-white/90 font-black uppercase tracking-[0.15em]">
                                            New Password
                                        </label>
                                        <div className="neo-input-modal relative h-14 rounded-2xl overflow-hidden">
                                            <Lock
                                                className={`absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 transform-gpu transition-colors duration-200 ${password.length > 0 ? "text-white" : "text-neutral-600"}`}
                                            />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••••••"
                                                autoComplete="new-password"
                                                className="w-full h-full pl-11 pr-11 bg-[#0a0a0a] text-sm font-bold text-white placeholder:text-neutral-700 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white hover:cursor-pointer transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                                            </button>
                                        </div>

                                        {passwordStrength && (
                                            <div className="px-1">
                                                <div className="w-full h-1 overflow-hidden bg-neutral-800 rounded-full">
                                                    <div
                                                        className="strength-bar h-full"
                                                        style={{ width: passwordStrength.width, backgroundColor: passwordStrength.color }}
                                                    />
                                                </div>
                                                <p
                                                    className="mt-1 text-[8px] font-black uppercase tracking-widest"
                                                    style={{ color: passwordStrength.color }}
                                                >
                                                    {passwordStrength.label}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 pb-1">
                                        <label className="pl-1 text-[12px] text-white/90 font-black uppercase tracking-[0.15em]">
                                            Confirm Password
                                        </label>
                                        <div className="neo-input-modal relative h-14 rounded-2xl overflow-hidden">
                                            <Lock
                                                className={`absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 transform-gpu transition-colors duration-200 ${confirmPassword.length > 0 ? "text-white" : "text-neutral-600"}`}
                                            />
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                name="confirmPassword"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••••••"
                                                autoComplete="new-password"
                                                className="w-full h-full pl-11 pr-11 bg-[#0a0a0a] text-sm font-bold text-white placeholder:text-neutral-700 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white hover:cursor-pointer transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                                            </button>
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
                                        className={`flex items-center justify-center w-full h-16 font-sans italic gap-1.5 bg-neon-pink rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] text-center text-lg text-white font-black [text-shadow:2px_2px_4px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[0px_0px_0px_rgba(0,0,0,0)] hover:cursor-pointer transition-all duration-200 transform-gpu center-stage-btn ${mutation.isPending ? "opacity-70" : ""}`}
                                    >
                                        {mutation.isPending ? "Resetting..." : "Reset Password"}
                                    </button>

                                    <div className="pt-4 border-t border-white/5 text-center">
                                        <p className="text-[12px] text-white/60 font-bold uppercase tracking-widest">
                                            Remember it after all?{" "}
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

export default ResetPassword;
