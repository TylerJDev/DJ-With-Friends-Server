import { globalStore } from '../store/index.js';
import winston from '../../../config/winston';

export const refreshAccessToken = (data) => {
    // Find the "old" access token carrier
    const allUsers = globalStore.rooms.map((curr) => curr.trackHosts);

    winston.info('refreshAccessToken - Requesting refresh');
    allUsers.forEach((currentUser) => {
        currentUser = Array.from(currentUser);

        if (data.oldAccessToken === currentUser[0].accessToken && data.id === currentUser[0].user.id) {
            currentUser[0].accessToken = data.newAccessToken;
            currentUser[0].user.accessToken = data.newAccessToken;
            winston.info(`newAccessToken: ${data.newAccessToken}`);
        }
    });
};
