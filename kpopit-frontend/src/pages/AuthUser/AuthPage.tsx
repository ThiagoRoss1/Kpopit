import { useState, useMemo, useEffect, useRef } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { User, Lock, Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { useAuthUser } from "../../hooks/useAuthUser";
import { useAuth } from "../../hooks/useAuth";
import { getIdolsPage, getGameModesCount, checkUsernameAvailability } from "../../services/api";
import type { IdolsPageData } from "../../interfaces/gameInterfaces";
import type { LoginData, RegisterData } from "../../interfaces/authInterfaces";
import AuthBackground from "./AuthBackground";
import "./authPage.css";

// Mirrors backend validate_username in utils/auth_helpers.py
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

function getPasswordStrength(pass: string) {
    if (!pass) return null;
    if (pass.length < 8) return { label: "Weak", color: "#ff4444", width: "33%" };
    const hasLetter = /[a-zA-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);
    if (hasLetter && hasNumber && hasSpecial) return { label: "Strong", color: "#00C851", width: "100%" };
    return { label: "Medium", color: "#ffbb33", width: "66%" };
}

const AuthPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isLoginTab = location.pathname === "/login";
    const { register, login } = useAuthUser();
    const { isAuthenticated, isLoading: isAuthLoading, refreshAuth } = useAuth();

    type UsernameStatus = "idle" | "checking" | "available" | "taken";

    useEffect(() => {
        setError(null);
    }, [location.pathname]);

    const [registerFormData, setRegisterFormData] = useState<RegisterData>({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [loginFormData, setLoginFormData] = useState<LoginData>({
        identifier: "",
        password: "",
        rememberMe: false,
    });

    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
    const debounceTimerRef = useRef<number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const activePassword = isLoginTab ? loginFormData.password : registerFormData.password;

    const passwordStrength = useMemo(() => {
        if (isLoginTab) return null;
        return getPasswordStrength(registerFormData.password);
    }, [isLoginTab, registerFormData.password]);

    const { data: idolsData } = useQuery<IdolsPageData[]>({
        queryKey: ["idolsPageData"],
        queryFn: getIdolsPage,
        staleTime: 1000 * 60 * 60 * 4,
        refetchOnWindowFocus: false,
    });
    const idolCount = idolsData?.length?? null;

    const { data: gameModesData } = useQuery<{ gamemodes_count: number }>({
        queryKey: ["gameModesCount"],
        queryFn: getGameModesCount,
        staleTime: 1000 * 60 * 60 * 4,
        refetchOnWindowFocus: false,
    });
    const gameModeCount = gameModesData?.gamemodes_count ?? null;

    const loginMutation = useMutation({
        mutationFn: (data: LoginData) => login(data),
        onSuccess: async () => {
            await refreshAuth();
            navigate("/");
        },
        onError: (err: Error) => setError(err.message || "Invalid credentials"),
    });

    const registerMutation = useMutation({
        mutationFn: (data: RegisterData) => register(data),
        onSuccess: async () => {
            await refreshAuth();
            navigate("/");
        },
        onError: (err: Error) => setError(err.message || "Registration failed"),
    });

    const isPending = loginMutation.isPending || registerMutation.isPending;

    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRegisterFormData({ ...registerFormData, [e.target.name]: e.target.value });
    };

    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoginFormData({ ...loginFormData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (isLoginTab) {
            loginMutation.mutate(loginFormData);
        } else {
            if (registerFormData.password !== registerFormData.confirmPassword) {
                setError("Passwords do not match");
                return;
            }
            registerMutation.mutate(registerFormData);
        }
    };

    const dotsCount = isLoginTab ? 2 : 4;
    const dotsFilled = isLoginTab
        ? [loginFormData.identifier.length > 0, loginFormData.password.length > 0]
        : [
            registerFormData.username.length > 0,
            registerFormData.password.length > 0,
            (registerFormData.email ?? "").length > 0,
            registerFormData.confirmPassword.length > 0,
        ];

    // Mirrors backend validate_username — only used for the register tab's Check icon.
    const isValidUsername =
        registerFormData.username.length >= 3
        && registerFormData.username.length <= 30
        && USERNAME_REGEX.test(registerFormData.username);

    useEffect(() => {
        if (debounceTimerRef.current !== null) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (isLoginTab || !isValidUsername) {
            setUsernameStatus("idle");
            return;
        }

        setUsernameStatus("checking");

        const username = registerFormData.username;
        debounceTimerRef.current = window.setTimeout(() => {
            const controller = new AbortController();
            abortControllerRef.current = controller;

            const check = async () => {
                try {
                    const res = await checkUsernameAvailability(username, controller.signal);
                    if (controller.signal.aborted) return;
                    setUsernameStatus(res.available ? "available" : "taken");
                } catch (error: unknown) {
                    const e = error as { code?: string; name?: string };
                    if (e?.code === "ERR_CANCELED" || e?.name === "AbortError") return;
                    setUsernameStatus("idle");
                }
            };

            check();
        }, 400);

        return () => {
            if (debounceTimerRef.current !== null) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, [registerFormData.username, isLoginTab, isValidUsername]);

    if (!isAuthLoading && isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return (
        <>
            <AuthBackground />
            <div className="relative flex flex-col items-center justify-center min-h-full w-full">

                {/* Main content */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full px-2 sxs:px-3 sm:px-4 pt-15 pb-8">

                    <div className="relative w-full max-w-120">
                        <div className="absolute inset-0 z-0 bg-[#0a0a0a] border border-solid border-neon-pink/15 rounded-[40px] modal-outer-shadow translate-x-0.75 translate-y-0.75 rotate-[1.5deg] transform-gpu" />

                        <div className="relative z-10 flex flex-col bg-[#111111] border-4 border-neon-pink rounded-[40px] p-5 sxs:p-6 sm:p-8 modal-inner-shadow">
                            {/* Tab toggle */}
                            <div className="relative flex overflow-hidden mb-8 p-1.5 bg-black/40 border-4 border-solid border-neon-pink rounded-3xl">
                                <Link
                                    to="/login"
                                    className={`flex z-10 items-center justify-center flex-1 h-12 rounded-3xl text-sm sxs:text-[20px] font-sans italic font-bold transition-colors duration-300
                                    ${isLoginTab ? "text-white" : "text-gray-500 hover:text-gray-300"}
                                    ${location.pathname === "/login" ? "[text-shadow:2px_2px_2px_rgba(0,0,0,0.6)]" : ""}`}
                                >
                                    Login
                                </Link>

                                <Link
                                    to="/register"
                                    className={`flex z-10 items-center justify-center flex-1 h-12 rounded-3xl text-sm sxs:text-[20px] font-sans italic font-bold transition-colors duration-300
                                    ${!isLoginTab ? "text-white" : "text-gray-500 hover:text-gray-300"}
                                    ${location.pathname === "/register" ? "[text-shadow:2px_2px_2px_rgba(0,0,0,1)]" : ""}`}
                                >
                                    Register
                                </Link>

                                {/* Animated form pill */}
                                <motion.div
                                    className="absolute top-1/2 h-[calc(100%-12px)] bg-neon-pink rounded-2xl pointer-events-none -translate-y-1/2 transform-gpu"
                                    initial={false}
                                    animate={{
                                        left: isLoginTab ? "6px" : "calc(50% + 3px)",
                                        width: "calc(50% - 9px)",
                                    }}
                                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                />
                            </div>

                            {/* Title */}
                            <div className="mb-6 text-center">
                                <h1 className="text-4xl sxs:text-5xl font-sans flex flex-col font-black uppercase leading-tight">
                                    <span className="text-white">{isLoginTab ? "Ready to" : "Join the"}</span>
                                    <span className="text-neon-pink">{isLoginTab ? "Stand Out?" : "Universe."}</span>
                                </h1>
                                <p className="mt-3 text-[12px] text-white/40 font-black uppercase tracking-[0.5em]">
                                    {isLoginTab ? "Spotlight awaits" : "Start your streak today"}
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                                {/* Username / identifier */}
                                <div className="flex flex-col gap-2 pb-1">
                                    <label className="pl-1 text-[12px] text-white/90 font-black uppercase tracking-[0.15em]">
                                        {isLoginTab ? "Username or Email" : "Username"}
                                    </label>
                                    <div className="neo-input-modal relative h-14 rounded-2xl overflow-hidden">
                                        <User
                                            className={`absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 transform-gpu transition-colors duration-200
                                            ${isLoginTab ? (loginFormData.identifier.length > 0 ? "text-white" : "text-neutral-600")
                                            : (registerFormData.username.length > 0 ? "text-white" : "text-neutral-600")}`}
                                        />
                                        <input
                                            type="text"
                                            name={isLoginTab ? "identifier" : "username"}
                                            value={isLoginTab ? loginFormData.identifier : registerFormData.username}
                                            onChange={isLoginTab ? handleLoginChange : handleRegisterChange}
                                            placeholder={isLoginTab ? "@username or email" : "Pick your stage name"}
                                            autoComplete="username"
                                            className="w-full h-full pl-11 pr-11 bg-[#0a0a0a] text-sm font-bold text-white placeholder:text-neutral-700 focus:outline-none"
                                        />

                                        {!isLoginTab && isValidUsername && usernameStatus === "checking" && (
                                            <Loader2 className="absolute right-4 top-1/2 w-4 h-4 -translate-y-1/2 text-neutral-400 animate-spin" />
                                        )}
                                        {!isLoginTab && isValidUsername && usernameStatus === "available" && (
                                            <Check className="absolute right-4 top-1/2 w-4 h-4 -translate-y-1/2 text-green-500" />
                                        )}
                                        {!isLoginTab && isValidUsername && usernameStatus === "taken" && (
                                            <X className="absolute right-4 top-1/2 w-4 h-4 -translate-y-1/2 text-red-500" />
                                        )}

                                    </div>
                                    {!isLoginTab && usernameStatus === "taken" && (
                                        <p className="pl-1 max-xxs:text-[10px] xxs:text-[12px] font-black uppercase tracking-widest text-red-500">
                                            Username already taken
                                        </p>
                                    )}
                                </div>

                                {/* Email (register only) */}
                                {!isLoginTab && (
                                    <div className="flex flex-col gap-2 pb-1">
                                        <label className="flex justify-between items-center pl-1 text-[12px] text-white/90 font-black uppercase tracking-[0.15em]">
                                            <span>Email Address</span>

                                            <span className="text-[12px] text-neutral-500 italic normal-case tracking-normal pr-1">Optional — for password recovery</span>
                                        </label>

                                        <div className="neo-input-modal relative h-14 rounded-2xl overflow-hidden">
                                            <input
                                                type="email"
                                                name="email"
                                                value={registerFormData.email ?? ""}
                                                onChange={handleRegisterChange}
                                                placeholder="bias@example.com"
                                                autoComplete="email"
                                                className="w-full h-full px-5 bg-[#0a0a0a] text-sm font-bold text-white placeholder:text-neutral-700 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Password */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-end pl-1">
                                        <label className="text-[12px] text-white/90 font-black uppercase tracking-[0.15em]">
                                            Password
                                        </label>
                                        {isLoginTab && (
                                            <Link
                                                to="/forgot-password"
                                                className="text-[12px] text-neutral-500 font-black hover:text-white
                                                hover:underline hover:underline-offset-2 transition-all duration-300"
                                            >
                                                Forgot password?
                                            </Link>
                                        )}
                                    </div>
                                    <div className="neo-input-modal relative h-14 rounded-2xl overflow-hidden">
                                        <Lock
                                            className={`absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 transform-gpu transition-colors duration-200 ${activePassword.length > 0 ? "text-white" : "text-neutral-600"}`}
                                        />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={activePassword}
                                            onChange={isLoginTab ? handleLoginChange : handleRegisterChange}
                                            placeholder="••••••••••••"
                                            autoComplete={isLoginTab ? "current-password" : "new-password"}
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

                                    {/* Strength bar (register only) */}
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

                                {/* Confirm password (register only) */}
                                {!isLoginTab && (
                                    <div className="flex flex-col gap-2 pb-1">
                                        <label className="pl-1 text-[12px] text-white/90 font-black uppercase tracking-[0.15em]">
                                            Confirm Password
                                        </label>
                                        <div className="neo-input-modal relative h-14 rounded-2xl overflow-hidden">
                                            <Lock
                                                className={`absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 transform-gpu transition-colors duration-200 ${activePassword.length > 0 ? "text-white" : "text-neutral-600"}`}
                                            />
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                name="confirmPassword"
                                                value={registerFormData.confirmPassword}
                                                onChange={handleRegisterChange}
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
                                )}

                                {/* Remember me (login only) */}
                                {isLoginTab && (
                                    <div className="flex justify-between items-center">
                                        <div
                                            className="group flex items-center gap-3 cursor-pointer"
                                            onClick={() => setLoginFormData({ ...loginFormData, rememberMe: !loginFormData.rememberMe })}
                                        >
                                            <div
                                                className={`flex items-center justify-center w-7 h-7 border-2 border-white/20 rounded-lg transform-gpu transition-all duration-200
                                                ${loginFormData.rememberMe ? "bg-neon-pink" : "bg-[#1a1a1a]"}`}
                                            >
                                                {loginFormData.rememberMe && <Check className="w-5 h-5 text-white" />}
                                            </div>

                                            <span className="text-[12px] text-neutral-500 font-black uppercase tracking-widest group-hover:text-neutral-300 transition-colors">
                                                Remember me
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Error message */}
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

                                {/* Submit button */}
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className={`flex items-center justify-center w-full h-16 font-sans italic gap-1.5 bg-neon-pink rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] text-center text-lg text-white font-black [text-shadow:2px_2px_4px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[0px_0px_0px_rgba(0,0,0,0)] hover:cursor-pointer transition-all duration-200 transform-gpu center-stage-btn ${isPending ? "opacity-70" : ""}`}
                                >
                                    {isPending
                                        ? (isLoginTab ? "Signing in..." : "Creating account...")
                                        : (isLoginTab ? "Login to Stage" : "Join the Stage")
                                    }
                                </button>

                                {/* Progress dots */}
                                <div className="flex justify-center gap-4 py-1">
                                    {Array.from({ length: dotsCount }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`validation-dot w-3.5 h-3.5 rounded-full transform-gpu ${dotsFilled[i] ? "filled" : ""}`}
                                        />
                                    ))}
                                </div>

                                {/* Switch prompt */}
                                <div className="pt-4 border-t border-white/5 text-center">
                                    <p className="text-[12px] text-white/60 font-bold uppercase tracking-widest">
                                        {isLoginTab ? "Don't have an account?" : "Already have an account?"}{" "}
                                        <Link
                                            to={isLoginTab ? "/register" : "/login"}
                                            className="ml-1 text-neon-pink font-black decoration-2 underline-offset-4 hover:underline transition-all"
                                        >
                                            {isLoginTab ? "Sign Up Now" : "Login"}
                                        </Link>
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Bottom stats */}
                    <div className="relative z-10 flex flex-col xm:flex-row justify-center items-center gap-6 mt-10 max-zm:text-sm zm:text-[12px] font-sans font-black uppercase zm:tracking-[0.2em] sm:tracking-[0.5em]">
                        <Link 
                            to="/idols"
                            className="hover:underline text-white/30"
                            >
                            <span className="text-neon-pink">{idolCount ?? "—"} <span className="text-white/30">Idols</span></span>
                        </Link>
                        <div className="w-1.5 h-1.5 bg-neon-pink rounded-full" />
                        <span className="text-neon-pink">{gameModeCount ?? "—"} <span className="text-white/30">Game Modes</span></span>
                        <div className="w-1.5 h-1.5 bg-neon-pink rounded-full" />
                        <span className="text-neon-pink">Daily <span className="text-white/30">Challenges</span></span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AuthPage;
