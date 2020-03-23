import { globalStore } from '../store/index.js';
import bcrypt from 'bcryptjs';

export const checkLock = (data, socket) => {
    const currentRoom = globalStore.rooms.findIndex(curr => String(curr.name) === data.roomID);

    if (globalStore.rooms[currentRoom] === undefined) {
        console.error(`[checkLock.js:8] Room ${currentRoom} does not currently exist!`);
        // TO-DO: Send error to current socket
        return false;
    }

    // Check the current room user limit
    if (globalStore.rooms[currentRoom].settings['user-limit_'].length &&
        globalStore.rooms[currentRoom].users.length >= +globalStore.rooms[currentRoom].settings['user-limit_'] &&
        globalStore.rooms[currentRoom].token !== data.token) {
        // TO-DO: Confirm this isn't being emitted to all users    
        socket.emit('lockedRoom', {
            'userLimit': true
        });
        return false;
    }

    if (data.password === undefined) {
        if (currentRoom > -1 && globalStore.rooms[currentRoom].hasOwnProperty('password')) {
            socket.emit('lockedRoom', {
                'passwordProtected': true,
                'roomName': globalStore.rooms[currentRoom].settings['room_name'],
                'token': globalStore.rooms[currentRoom].token
            });
        } else {
            socket.emit('lockedRoom', {
                'passwordProtected': false
            });
        }
    } else {
        bcrypt.compare(data.password, globalStore.rooms[currentRoom].password.hash, function (err, res) {
            socket.emit('passwordCheck', res);
        });
    }
}