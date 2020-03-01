import { globalStore } from '../store/index.js';
import bcrypt from 'bcryptjs';

export const checkLock = (data, socket) => {
    const currentRoom = globalStore.rooms.findIndex(curr => String(curr.name) === data.roomID);
    console.log(data);

    if (globalStore.rooms[currentRoom] === undefined) {
        console.log('Yes, this room doesn\'t exist!');
        // pseudo code client.send('error', {'typeError': 'Room does not exist', 'errorMessage': 'Room ${roomId} does not exist!'})
        return false;
    }

    // Check the current room user limit
    if (globalStore.rooms[currentRoom].settings['user-limit_'].length &&
        globalStore.rooms[currentRoom].users.length >= +globalStore.rooms[currentRoom].settings['user-limit_'] &&
        globalStore.rooms[currentRoom].token !== data.token) {
        // pseudo code client.send('error', {'typeError': 'Room user limit', 'errorMessage': 'Room user limit has already been reached!'})        
        console.log('Room limit reached!');
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