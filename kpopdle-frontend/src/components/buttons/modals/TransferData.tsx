import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { addGeneratedCodes, redeemTransferCode, fetchGameState } from '../../../services/api';
import { encryptToken, decryptToken } from '../../../utils/tokenEncryption';
import type { GeneratedCodes, GuessResponse, RedeemUserToken } from '../../../interfaces/gameInterfaces';

interface TransferDataTextProps {
    codes?: GeneratedCodes | undefined;
    user_token: string;
}


const TransferDataText = (props: TransferDataTextProps) => {
    const { codes, user_token } = props;

    const [generatedCodes, setGeneratedCodes] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [inputCode, setInputCode] = useState<string>("");

    const generateMutation = useMutation<GeneratedCodes>({
        mutationKey: ['generateCodes'],
        mutationFn: async () => {
            const decrypted = await decryptToken(user_token);
            return addGeneratedCodes(decrypted);
        },
        onSuccess: (data) => {
            setGeneratedCodes(data.transfer_code);  
            setExpiresAt(data.expires_at);
            console.log("Generated Codes:", data.transfer_code);
            console.log("Expires at:", data.expires_at);
        }
    });

    const redeemMutation = useMutation<RedeemUserToken, Error, string>({
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
            console.error("Error redeeming code:", error);
        }
    });

    const handleGenerate = () => {
        generateMutation.mutate();
    }

    const handleRedeem = async () => {
        redeemMutation.mutate(inputCode);
    }

    const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;

    const timeLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;




    return (
        <div className='flex flex-col gap-2'>
            <div className='flex flex-col justify-center items-center gap-2'>
                {/* {!isExpired && generatedCodes && ( */}
                <button 
                onClick={handleGenerate}
                className='w-30 h-10 bg-black justify-center items-center rounded-2xl'>
                    Generate
                </button>
                {/* )} */}
                <span>WIP</span>

            </div>

            <div className='flex flex-col justify-center items-center gap-2'>
                <input 
                value={inputCode}
                onChange={e => setInputCode(e.target.value)}
                type='text'
                className='w-40 h-10 bg-white/20 rounded-2xl px-2'/>
                <button
                onClick={handleRedeem}
                className='w-20 h-20 rounded-full bg-black'>
                    Redeem
                </button>
                
            </div>
        </div>
    )
}

export default TransferDataText;