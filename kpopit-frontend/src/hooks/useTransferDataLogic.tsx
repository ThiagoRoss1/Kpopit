import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addGeneratedCodes, redeemTransferCode, fetchGameState, getActiveTransferCode } from '../services/api';
import { encryptToken, decryptToken } from '../utils/tokenEncryption';
import type { GeneratedCodes, GuessResponse, RedeemUserToken } from '../interfaces/gameInterfaces';
import type { AxiosError } from 'axios';

export const useTransferDataLogic = () => {
    const [generatedCodes, setGeneratedCodes] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [redeemError, setRedeemError] = useState<string | null>(null);

    const queryClient = useQueryClient();

    const { data: activeCodeData } = useQuery<GeneratedCodes>({
        queryKey: ['activeTransferCode'],
        queryFn: async () => {
            const encrypted = localStorage.getItem("userToken") || "";
            const decrypted = await decryptToken(encrypted);
            return getActiveTransferCode(decrypted);
        },
        enabled: !!localStorage.getItem("userToken"),
    });

    useEffect(() => {
        if (activeCodeData?.transfer_code) {
            setGeneratedCodes(activeCodeData.transfer_code);
            setExpiresAt(activeCodeData.expires_at);
           
        } else if (activeCodeData && !activeCodeData.transfer_code) {
            setGeneratedCodes(null);
            setExpiresAt(null);

        }
    }, [activeCodeData]);

    const generateMutation = useMutation<GeneratedCodes>({
        mutationKey: ['generateCodes'],
        mutationFn: async () => {
            const encrypted = localStorage.getItem("userToken") || "";
            const decrypted = await decryptToken(encrypted);
            return addGeneratedCodes(decrypted);
        },
        onSuccess: (data) => {
            setGeneratedCodes(data.transfer_code);  
            setExpiresAt(data.expires_at);
            queryClient.invalidateQueries({ queryKey: ['activeTransferCode'] }); // Refetch without the need to reload
            
            console.log("Generated Codes:", data.transfer_code);
            console.log("Expires at:", data.expires_at);
        }
    });

    const redeemMutation = useMutation<RedeemUserToken, AxiosError<{ error: string }>, string>({
        mutationKey: ['redeemCode'],
        mutationFn: async (code) => redeemTransferCode(code),
        onSuccess: async (data) => {
            const gameState = await fetchGameState(data.user_token);
            console.log("Fetched game state after redeem:", gameState);

            if (gameState && gameState.today_guesses_details) {
                localStorage.setItem("todayGuessesDetails", JSON.stringify(gameState.today_guesses_details));
                localStorage.setItem("animatedIdols", JSON.stringify(gameState.animated_idols || []));
                localStorage.setItem("gameDate", gameState.game_date || "");
                localStorage.setItem("gameComplete", String(gameState.game_complete || false));
                localStorage.setItem("gameWon", String(gameState.game_won || false));
                localStorage.setItem("guessedIdols", JSON.stringify(gameState.guessed_idols || []));

                if (gameState.hints_revealed) {
                    localStorage.setItem("hint1Revealed", JSON.stringify(gameState.hints_revealed.hint1 || false));
                    localStorage.setItem("hint2Revealed", JSON.stringify(gameState.hints_revealed.hint2 || false));
                }

                if (gameState.show_hints) {
                    localStorage.setItem("showHint1", JSON.stringify(gameState.show_hints.hint1 || false));
                    localStorage.setItem("showHint2", JSON.stringify(gameState.show_hints.hint2 || false));
                }

                if (gameState.colorize_hints) {
                    localStorage.setItem("colorize1", JSON.stringify(gameState.colorize_hints.hint1 || false));
                    localStorage.setItem("colorize2", JSON.stringify(gameState.colorize_hints.hint2 || false));
                }

                const animatedIdols = gameState.today_guesses_details.map(
                    (guess: GuessResponse) => guess.guessed_idol_data.idol_id
                );
                localStorage.setItem("animatedIdols", JSON.stringify(animatedIdols));
            }

            const encrypted = await encryptToken(data.user_token);
            localStorage.setItem('userToken', encrypted);
            console.log("Redeemed user token", data.user_token);

            window.location.reload();
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

    const timeLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

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
    };
};