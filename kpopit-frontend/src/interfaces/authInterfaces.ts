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
    username_changed_at: string | null;
}

export interface UserProfile {
    display_name: string;
    avatar_url: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
}

export interface MeResponse {
    user_credentials: AuthUser;
    profile: UserProfile;
}

export interface UpdateProfilePayload {
    display_name?: string;
    username?: string;
    current_password?: string;
}

export interface AuthPendingChanges {
    displayName: string | null;
    username: string | null;
    usernameCurrentPassword: string | null;
    newPassword: string | null;
    confirmNewPassword: string | null;
    currentPasswordForPwChange: string | null;
    avatarFile: Blob | null;
    avatarFilePreviewUrl: string | null;
    avatarIdolUrl: string | null;
}