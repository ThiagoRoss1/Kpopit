interface LoginFormProps {
    field: string;
    fieldDescription: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function LoginForm(props: LoginFormProps) {
    const { field, fieldDescription, placeholder, value, onChange } = props;
    return (
        <div className="flex flex-col gap-1 justify-center items-start">
            <form className="flex">
                <span className="text-base font-sans font-bold italic text-black px-1">{fieldDescription}</span>
            </form>

            <input
                className="w-105 h-18 rounded-2xl border-4 border-black bg-white text-black px-4 font-sans font-bold text-lg
                focus:outline-none focus:ring-2 focus:ring-[#EF1F72] focus:border-[#EF1F72] focus:shadow-[6px_4px_0px_rgba(255,51,153,1)] transition-all duration-300 transform-gpu"
                type={field === "password" || field === "confirmPassword" ? "password" : "text"}
                autoComplete={field === "password" || field === "confirmPassword" ? "new-password" : "on"}
                name={field} 
                placeholder={placeholder} 
                value={value}
                onChange={onChange}
            />
        </div>

    )
}

export default LoginForm;