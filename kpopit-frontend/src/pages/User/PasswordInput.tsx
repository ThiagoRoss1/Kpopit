import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

interface PasswordInputProps {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoComplete?: string;
    autoFocus?: boolean;
}

const PasswordInput = ({
    value,
    onChange,
    placeholder = "••••••••••••",
    autoComplete = "current-password",
    autoFocus,
}: PasswordInputProps) => {
    const [show, setShow] = useState(false);

    return (
        <div className="ep-input relative h-13 rounded-2xl overflow-hidden bg-ink">
            <Lock className="absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-white" />
            <input
                autoFocus={autoFocus}
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                className="w-full h-full pl-11 pr-11 bg-ink text-sm font-bold text-white placeholder:text-neutral-700 focus:outline-none"
            />
            <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white hover:cursor-pointer transition-colors"
            >
                {show ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </button>
        </div>
    );
};

export default PasswordInput;
