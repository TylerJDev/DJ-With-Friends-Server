import { globalStore } from '../store/index.js';
import { playTrack }  from './addQueue.js'; 

export const userHosts = (currentUser, data={}, newRoom) => {
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

        let currentDevice = currentUser.active.devices.devices.length ? currentUser.active.devices.devices.filter(current => current.is_active)[0] : '';

        if (currentDevice !== undefined || currentDevice !== '') {
            currentDevice = currentDevice.id;
        } else if (currentDevice === undefined) {
            currentDevice = '';
        }

        globalStore.rooms[currentRoom].trackHosts.add({'deviceID': currentDevice, 'accessToken': currentUser.active.accessToken, 'user': currentUser.active});

        if (globalStore.rooms[currentRoom].noHost && globalStore.rooms[currentRoom].playData.currentUser !== undefined) {
            globalStore.rooms[currentRoom].noHost = false;

            // Remove duplicate addition
            globalStore.rooms[currentRoom].queue.shift()

            globalStore.rooms[currentRoom].queue.push(globalStore.rooms[currentRoom].playData.queueCurrent);

            // Reverse queue
            globalStore.rooms[currentRoom].queue.reverse();

            // Emit to entire room 
            newRoom.emit('addedQueue', globalStore.rooms[currentRoom].queue);

            playTrack(globalStore.rooms[currentRoom].playData.queueCurrent, globalStore.rooms[currentRoom].playData.currentUser, globalStore.rooms[currentRoom].playData.roomHost, globalStore.rooms[currentRoom].playData.newRoom);
        }
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