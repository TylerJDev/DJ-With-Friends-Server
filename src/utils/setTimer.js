/**
 * Sets a timer utilizing a promise.
 * @param {number} time - Amount to set timer 
 */

export const setTimer = (time) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(Date.now());
        }, time);
    });
}