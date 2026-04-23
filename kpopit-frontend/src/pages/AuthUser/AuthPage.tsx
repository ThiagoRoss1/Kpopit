import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import LoginForm from "./LoginForm";
import { useLocation } from "react-router-dom";
import { useAuthUser } from "../../hooks/useAuthUser";
import type { LoginData, RegisterData } from "../../interfaces/authInterfaces";
const AuthPage = () => {
    const submitButtonRef = useRef<HTMLButtonElement>(null);

    const decorBalls = 3;

    const [registerFormData, setRegisterFormData] = useState<RegisterData>({
        username: "",
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [loginFormData, setLoginFormData] = useState<LoginData>({
        identifier: "",
        password: "",
        rememberMe: false
    });
    const [loading, setLoading] = useState(false);

    const location = useLocation();
    const actual_path = location.pathname;

    const { register, login} = useAuthUser();

    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRegisterFormData({ ...registerFormData, [e.target.name]: e.target.value });
    };

    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoginFormData({ ...loginFormData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        try {
            if (actual_path === "/register") {
                if (registerFormData.password !== registerFormData.confirmPassword) {
                    console.log("Passwords do not match");
                    setLoading(false);
                    return;
                }

                await register(registerFormData);
            } else if (actual_path === "/login") {
                await login(loginFormData);
                console.log(`Login successful, user: ${loginFormData.identifier}`);
                return;
            }
        } catch (err) {
            console.error(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            submitButtonRef.current?.click();
        }
    };
    
    return (
        <div className="flex min-h-full min-w-full">
            <div className="flex w-full h-full justify-center items-center mt-20">
                <div className="flex flex-col w-125 h-fit bg-gray-200 rounded-[40px] shadow-[6px_6px_0px_rgba(255,51,153,1)] border-0 border-neon-pink px-10 mb-6">
                    <div className="flex flex-row justify-center items-center gap-4 mt-8 mb-8">
                        <span className="font-extrabold text-4xl
                        [text-shadow:2px_2px_0px_rgba(255,51,153,0.5)]">
                            Kpopit - {actual_path === "/login" ? "Login" : "Register"}
                        </span>
                    </div>

                    <div className="flex flex-row w-105 h-22 bg-white border-4 border-black rounded-2xl gap-2 justify-between items-center px-2 py-2 mb-8">
                        <Link 
                            to="/login" 
                            className={`flex ${actual_path === "/login" ? "bg-[#EF1F72] border-black" : "bg-transparent border-transparent hover:bg-[#EF1F72]/40"} w-full h-full rounded-2xl border-4 justify-center items-center text-center
                            transition-colors duration-300 transform-gpu`}
                        >
                            <span className="text-3xl font-sans font-bold">Login</span>
                        </Link>

                        <Link 
                            to="/register" 
                            className={`flex ${actual_path === "/register" ? "bg-[#EF1F72] border-black" : "bg-transparent border-transparent hover:bg-[#EF1F72]/40"} w-full h-full rounded-2xl border-4 justify-center items-center text-center
                            transition-colors duration-300 transform-gpu`}
                        >
                            <span className="text-3xl font-sans font-bold">Register</span>
                        </Link>
                    </div>

                    <div className="flex flex-col w-full h-fit gap-5 justify-center items-center mb-5" onKeyDown={handleKeyDown}>
                        {actual_path === "/login" ? (
                            <>
                                <LoginForm 
                                    field="identifier"
                                    fieldDescription="Username / Email"
                                    placeholder="Enter your username or email"
                                    value={loginFormData.identifier}
                                    onChange={handleLoginChange}
                                />

                                <LoginForm
                                    field="password"
                                    fieldDescription="Password"
                                    placeholder="Enter your password"
                                    value={loginFormData.password}
                                    onChange={handleLoginChange} 
                                />
                            </>
                        ) : (
                            <>
                                <LoginForm 
                                    field="username"
                                    fieldDescription="Username"
                                    placeholder="Enter your username"

                                    value={registerFormData.username}
                                    onChange={handleRegisterChange}
                                />

                                <LoginForm 
                                    field="email"
                                    fieldDescription="Email (optional) - for password recovery"
                                    placeholder="Enter your email"
                                    value={registerFormData.email ?? ""}
                                    onChange={handleRegisterChange}
                                />

                                <LoginForm 
                                    field="password"
                                    fieldDescription="Password"
                                    placeholder="Enter your password"
                                    value={registerFormData.password}
                                    onChange={handleRegisterChange}
                                />

                                <LoginForm 
                                    field="confirmPassword"
                                    fieldDescription="Confirm Password"
                                    placeholder="Confirm your password"
                                    value={registerFormData.confirmPassword}
                                    onChange={handleRegisterChange}
                                />                            
                            </>
                        )}    
                    </div>

                    {actual_path === "/login" && (
                        <div 
                            className="flex flex-row w-full h-fit justify-start items-center text-center gap-2 hover:cursor-pointer"
                            onClick={() => {
                                setLoginFormData({ ...loginFormData, rememberMe: !loginFormData.rememberMe })
                            }}
                        >
                            <button 
                                type="button"
                                className={`w-10 h-10 rounded-xl border-2 border-black ${loginFormData.rememberMe ? "bg-[#EF1F72]" : "bg-transparent"}
                                hover:cursor-pointer ${!loginFormData.rememberMe ? "hover:bg-[#EF1F72]/40" : ""} transition-colors duration-300 transform-gpu`} 
                            />

                            <span className="text-black font-sans font-extrabold text-lg">
                                Remember me
                            </span>

                        </div>
                    )}

                    <div className="flex w-full h-fit justify-center items-center mt-8">
                        <button 
                            ref={submitButtonRef}
                            type="button"
                            onClick={handleSubmit}
                            className="w-82 h-17 bg-[#EF1F72] text-black justify-center items-center text-center
                            rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] border-4 border-black
                            hover:cursor-pointer hover:shadow-[0px_0px_0px_rgba(0,0,0,0)] hover:translate-x-1 hover:translate-y-1 transiton-all duration-200 transform-gpu"
                            disabled={loading}
                        >
                                <span className="text-black font-sans font-extrabold text-4xl">
                                    {actual_path === "/login" ? "Login" : "Register"}
                                </span>
                        </button>
                    </div>

                    <div className="flex w-full h-fit justify-center items-center gap-5 mt-8 mb-3">
                        {decorBalls > 0 && Array.from({ length: decorBalls }).map((_, index) => (
                            <div 
                                key={index}
                                className="w-13 h-13 rounded-full bg-neon-pink border-4 border-black animate-pulse"
                                style={{
                                    animationDelay: `${index * 0.3}s`
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AuthPage;