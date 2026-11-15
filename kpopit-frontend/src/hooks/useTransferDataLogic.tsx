import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addGeneratedCodes, redeemTransferCode, getActiveTransferCode, restoreSession } from '../services/api';
import { applyRestoredSession } from '../utils/applyRestoredSession';
import { clearModeKeys } from '../utils/gameStorage';
import { encryptToken, decryptToken } from '../utils/tokenEncryption';
import { safeReload } from '../utils/safeReload';
import type { GeneratedCodes, RedeemUserToken } from '../interfaces/gameInterfaces';
import type { AxiosError } from 'axios';
import { useNow } from './useNow';

export const useTransferDataLogic = () => {
    const [redeemError, setRedeemError] = useState<string | null>(null);

    const queryClient = useQueryClient();


    const { data: activeCodeData, refetch: refetchActiveCode } = useQuery<GeneratedCodes>({
        queryKey: ['activeTransferCode'],
        queryFn: async () => {
            const encrypted = localStorage.getItem("userToken") || "";
            const decrypted = await decryptToken(encrypted);
            return getActiveTransferCode(decrypted);
        },
        enabled: false,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5,
    });

    // The active code is the query's data; generating a code writes it there.
    const generatedCodes = activeCodeData?.transfer_code || null;
    const expiresAt = generatedCodes ? activeCodeData?.expires_at ?? null : null;

    const generateMutation = useMutation<GeneratedCodes>({
        mutationKey: ['generateCodes'],
        mutationFn: async () => {
            const encrypted = localStorage.getItem("userToken") || "";
            const decrypted = await decryptToken(encrypted);
            return addGeneratedCodes(decrypted);
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['activeTransferCode'], data);

            if (import.meta.env.DEV) console.log("Generated code:", data.transfer_code, "expires at:", data.expires_at);
        }
    });

    const redeemMutation = useMutation<RedeemUserToken, AxiosError<{ error: string }>, string>({
        mutationKey: ['redeemCode'],
        mutationFn: async (code) => redeemTransferCode(code),
        onSuccess: async (data) => {
            // The code's account replaces this device's day in every mode, not just Classic.
            (["classic", "blurry", "pixelated", "inkit"] as const).forEach((mode) => clearModeKeys(localStorage, mode));
            try {
                applyRestoredSession(await restoreSession(data.user_token));
            } catch (error) {
                // With the keys cleared, each page restores its day from the server on load.
                if (import.meta.env.DEV) console.warn("Could not restore the transferred day:", error);
            }

            const encrypted = await encryptToken(data.user_token);
            localStorage.setItem('userToken', encrypted);
            if (import.meta.env.DEV) console.log("Redeemed user token", data.user_token);

            safeReload();
        },
        onError: (error) => {
            const backendMessage = error?.response?.data?.error || "Unknown error";
            setRedeemError(backendMessage);
        }
    });

    const handleGenerate = () => {
        generateMutation.mutate();
    }

    const handleRedeem = async (code: string) => {
        redeemMutation.mutate(code);
    }

    const clearError = () => {
        setRedeemError(null);
    }

    // Time test
    const canManipulate = false;
    const manipulatedDate = new Date();
    if (canManipulate) manipulatedDate.setDate(manipulatedDate.getDate() + 0);

    const now = useNow();
    const timeLeft = expiresAt && now > 0 ? Math.ceil((new Date(expiresAt).getTime() - now) / (1000 * 60 * 60 * 24)) : null;

    const fetchActiveCodeWrapper = async () => {
        const result = await refetchActiveCode();
        return result.data?.transfer_code || null;
    }

    return {
        generatedCodes,
        expiresAt,
        timeLeft,
        handleGenerate,
        handleRedeem,
        redeemError,
        clearError,
        isGenerating: generateMutation.isPending,
        isRedeeming: redeemMutation.isPending,
        fetchActiveCode: fetchActiveCodeWrapper,
    };
};