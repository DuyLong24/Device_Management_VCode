import { useCallback } from 'react';

export const useScanSound = () => {
    const beep = useCallback((type: 'success' | 'error') => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'success') {
                osc.type = 'sine';
                osc.frequency.value = 1000;
            } else {
                osc.type = 'sawtooth';
                osc.frequency.value = 200;
            }

            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {
            console.error(e);
        }
    }, []);

    return {
        playSuccess: () => beep('success'),
        playError: () => beep('error')
    };
};