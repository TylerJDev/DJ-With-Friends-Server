import { userConnect } from './room_events/userConnect.js';
import { userDisconnect } from './room_events/userDisconnect.js';
import { addQueue } from './room_events/addQueue.js';
import { skipQueue } from './room_events/skipQueue.js';
import { changeSetting } from './room_events/changeSetting.js';
import { refreshAccessToken } from './room_events/refreshAccessToken.js';
import { userHosts } from './room_events/userHosts.js';
import { passwordStore } from './store/index';

export const socketRoom = function(io, id, rooms, host, lobby, socketID) {
    const thisRoom = rooms.filter((currentRoom) => currentRoom.name === id);
    let thisPassword = '';

    if (thisRoom !== undefined && thisRoom.length === 1 && Object.prototype.hasOwnProperty.call(thisRoom[0], 'psw_index')) {
        thisPassword = passwordStore.roomsPasswords[thisRoom[0].psw_index].password.hash;
    }

    const newRoom = io.of(`/${id}${thisPassword !== undefined && thisPassword.length ? thisPassword : ''}`);
    const usersRoom = {};

    newRoom.on('connection', (socket) => {
        let currentUser = {};

        // On connection to new room, all "sockets" currently connected
        // Should be emited data on new "socket" (user)

        // Grab details of user after emitting to newRoom
        socket.on('userDetails', (data) => { userConnect(data, id, currentUser, usersRoom, lobby, newRoom, host, socketID); }); 

        // Upon user adding "song" to queue
        socket.on('addQueue', (data) => { addQueue(data, newRoom, currentUser); });

        socket.on('skipTrack', () => { skipQueue(rooms, currentUser, newRoom); });
 
        socket.on('disconnect', () => { userDisconnect(usersRoom, currentUser, newRoom, id, lobby); });

        socket.on('changeSetting', (data) => { changeSetting(currentUser, data); });

        socket.on('refreshAccessToken', (data) => { refreshAccessToken(data, currentUser); });

        socket.on('userHosts', (data) => { userHosts(currentUser, data, newRoom); });
    });
}