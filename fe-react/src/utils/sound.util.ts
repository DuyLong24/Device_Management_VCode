let beepSound: HTMLAudioElement | null = null;
if (typeof window !== 'undefined') {
    beepSound = new Audio('/iphone-beep.m4a');
    beepSound.volume = 1.0;
}

export const playScanSuccessSound = () => {
    try {
        if (beepSound) {
            beepSound.currentTime = 0;
            beepSound.play().catch(e => console.log("Trình duyệt chặn autoplay:", e));
        }
    } catch (_) {
        /* silent fail trên môi trường không hỗ trợ Audio */
    }
};
