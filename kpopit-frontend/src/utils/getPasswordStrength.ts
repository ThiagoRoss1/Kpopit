export function getPasswordStrength(pass: string) {
    if (!pass) return null;
    if (pass.length < 8) return { label: "Weak", color: "#ff4444", width: "33%" };
    const hasLetter = /[a-zA-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);
    if (hasLetter && hasNumber && hasSpecial) return { label: "Strong", color: "#00C851", width: "100%" };
    return { label: "Medium", color: "#ffbb33", width: "66%" };
};