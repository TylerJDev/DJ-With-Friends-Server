/**
 * Sets a timer utilizing a promise.
 * @param {number} time - Amount to set timer 
 */

import { globalStore } from '../socket/store/index.js';

export const setTimer = (time, timeStarted, currentRoom) => {
    return new Promise((resolve) => {
        const timerInterval = setInterval(() => {
            if (Date.now() >= (timeStarted + time) || globalStore.rooms[currentRoom].skipped) {
                globalStore.rooms[currentRoom] && (globalStore.rooms[currentRoom].skipped = false);
                clearInterval(timerInterval);
                resolve(Date.now());
            }
        }, 100);
    });
}