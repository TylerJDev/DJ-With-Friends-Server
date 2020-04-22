import { globalStore } from '../store/index.js';

export const changeSetting = (currentUser, data) => {
    const currentRoom = globalStore.rooms.findIndex(curr => curr.name === currentUser.active.roomID);
    switch(data.type) {
        case 'devices':
            currentUser.active.mainDevice = data.mainDevice;
            break;
    }

    globalStore.rooms[currentRoom].trackHosts.forEach((current) => {
        if (current.user.accessToken === currentUser.active.accessToken) {
            current.deviceID = data.mainDevice;
        }
    })
}