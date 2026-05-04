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

export interface UserProfile {
    display_name: string;
    avatar_url: string;
    created_at: string;
    updated_at: string;
}

export interface MeResponse {
    user_credentials: AuthUser;
    profile: UserProfile;
}