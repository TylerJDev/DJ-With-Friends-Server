import { globalStore } from '../store/index.js';

export const refreshAccessToken = (data) => {
    // Find the "old" access token's carrier
    const allUsers = globalStore.rooms.map(curr => curr.users);

    allUsers.forEach((currentUser, index) => {
        console.log(`AccessToken: ${currentUser[0].accessToken}, index: ${index}, name: ${currentUser[0].name}`);
        if (data.oldAccessToken === currentUser[0].accessToken && data.id === currentUser[0].id) {
            currentUser[0].accessToken = data.newAccessToken;
        }
    });
}