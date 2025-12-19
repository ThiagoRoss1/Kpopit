// Token encryption // 

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material (transformed into bytes)
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Derive a key using PBKDF2
    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        } as Pbkdf2Params,
        keyMaterial,
        { name: 'AES-GCM', length: 256 } as AesKeyGenParams,
        false,
        ['encrypt', 'decrypt']      
    );
}

// Encrypt token 
export async function encryptToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);

    const password = import.meta.env.VITE_ENCRYPTION_KEY || "default-password";
    
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(password, salt);

    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
}

// Decrypt token
export async function decryptToken(encryptedToken: string): Promise<string> {
    const password = import.meta.env.VITE_ENCRYPTION_KEY || "default-password";

    const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);

    const key = await deriveKey(password, salt);

    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

