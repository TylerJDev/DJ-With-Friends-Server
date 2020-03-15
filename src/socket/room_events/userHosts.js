import { globalStore } from '../store/index.js';

export const userHosts = (currentUser, data={}) => {
    const currentRoom = globalStore.rooms.findIndex(curr => curr.name === currentUser.active.roomID);
    const checkHostUser = (hostObj) => {
        if (!hostObj.hasOwnProperty('host')) {
            return false;
        }

        globalStore.rooms[currentRoom].users.forEach((current) => {
            if (current.accessToken === currentUser.active.accessToken) {
                current.host = data.host;
            }
        });
    }

    if (!data.hasOwnProperty('host') || data.host === true) {
        checkHostUser(data);
        if ((currentUser.hasOwnProperty('host') && currentUser.host === false) || (!currentUser.active.accessToken.length && !currentUser.hasOwnProperty('host')) || (!currentUser.active.devices.devices.length && !currentUser.hasOwnProperty('host')) ) {
            return false;
        }

        let currentDevice = currentUser.active.devices.devices.length ? currentUser.active.devices.devices.filter(current => current.is_active)[0].id : '';

        globalStore.rooms[currentRoom].trackHosts.add({'deviceID': currentDevice, 'accessToken': currentUser.active.accessToken, 'user': currentUser.active});
    } else {
        checkHostUser(data);
        globalStore.rooms[currentRoom].trackHosts.forEach((current) => {
            if (current.user.accessToken === currentUser.active.accessToken) {
                // Add user to pause list
                globalStore.rooms[currentRoom].pauseList.add(current);
                globalStore.rooms[currentRoom].trackHosts.delete(current);
            }
        });
    }
}