// frontend/src/hooks/useDailyLogin.js

import { useEffect, useRef } from 'react';
import { claimDailyLogin } from '../services/coinsService';
import useAuthStore from '../store/authStore';

/**
 * Call this hook once in HomeScreen (or MainNavigator).
 * It auto-claims the daily login reward when the user opens the app.
 */
const useDailyLogin = () => {
    const isSignedIn = useAuthStore((s) => s.isSignedIn);
    const patchProfile = useAuthStore((s) => s.patchProfile);
    const hasClaimed = useRef(false);

    useEffect(() => {
        if (!isSignedIn || hasClaimed.current) return;

        const claim = async () => {
            hasClaimed.current = true;
            try {
                const res = await claimDailyLogin();
                if (res.success) {
                    // Update coin balance in local store immediately
                    patchProfile({ play_coins: res.data.new_balance });
                    console.log(`[DailyLogin] +${res.data.coins_earned} coins earned`);
                }
            } catch (err) {
                // Silent fail — user already claimed today or network issue
                console.log('[DailyLogin] Already claimed or failed:', err.message);
            }
        };

        claim();
    }, [isSignedIn]);
};

export default useDailyLogin;