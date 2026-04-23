export interface LoginData {
    identifier: string;
    password: string;
    rememberMe: boolean;
}

export interface RegisterData {
    username: string;
    email?: string;
    password: string;
    confirmPassword: string;
}

export interface AuthUser {
    user_id: number;
    username: string;
    email?: string;
    is_admin: boolean;
    is_authenticated: boolean;
}