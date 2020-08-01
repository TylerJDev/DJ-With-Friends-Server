import { globalStore } from '../store/index.js';
import winston from '../../../config/winston';
import { startFromPosition } from './addQueue.js';

export const refreshAccessToken = (data) => {
    // Find the "old" access token carrier
    const allUsers = globalStore.rooms.map((curr) => curr.trackHosts);

    winston.info('refreshAccessToken - Requesting refresh');
    allUsers.forEach((currentUser) => {
        currentUser = Array.from(currentUser);
        const currentRoom = globalStore.rooms.findIndex((curr) => curr.name === currentUser[0].user.roomID);
        if (data.oldAccessToken === currentUser[0].accessToken && data.id === currentUser[0].user.id) {
            currentUser[0].accessToken = data.newAccessToken;
            currentUser[0].user.accessToken = data.newAccessToken;
            winston.info(`newAccessToken: ${data.newAccessToken}`);

            try {
                const grabPosition = Date.now() - globalStore.rooms[currentRoom].currentTrack.timeStarted;
                startFromPosition(data.newAccessToken, currentUser[0].user.mainDevice, grabPosition, globalStore.rooms[currentRoom].currentTrack.trackURI); // (accessToken, position, trackURI, pause=false)
            } catch (e) {
                winston.error('Error occurred during grabbing position');
                winston.error(e);
            }
        }
    });
};
