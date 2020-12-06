import { globalStore } from '../store/index.js';
import winston from '../../../config/winston';
import { startFromPosition } from '../../utils/startFromPosition';
import {db} from '../socket_io';

export const refreshAccessToken = (data, user) => {
    // Find the "old" access token carrier
    const currentRoom = globalStore.rooms.findIndex(curr => {
        const thisUser = curr.users.filter(current => current.userID === user.active.userID)
        if (thisUser.length === 1) {
            return curr;
        }
    });
    
    if (data.id === user.active.id) {
        db.collection('users').doc(user.active.uid).get().then(async (docData) => {
            const {accessToken, mainDevice} = docData.data();
            const currentTrack = globalStore.rooms[currentRoom].currentTrack;
            const trackURI = currentTrack.trackURI;

            if (accessToken && accessToken !== data.newAccessToken) {
                db.collection('users').doc(user.active.uid).update({
                    accessToken: data.newAccessToken,
                });

                globalStore.rooms[currentRoom].accessStore[user.active.id] = data.newAccessToken;
                
                if (currentTrack.currentPlaying) {
                    startFromPosition(data.newAccessToken, mainDevice, (Date.now() - currentTrack.startedAt), trackURI);
                }
            }
        })
    }

    return;
};
