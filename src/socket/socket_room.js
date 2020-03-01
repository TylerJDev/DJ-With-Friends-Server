import { userConnect } from './room_events/userConnect.js';
import { userDisconnect } from './room_events/userDisconnect.js';
import { addQueue } from './room_events/addQueue.js';
import { skipQueue } from './room_events/skipQueue.js';
import { changeSetting } from './room_events/changeSetting.js';
import { refreshAccessToken } from './room_events/refreshAccessToken.js';

export const socketRoom = function(io, id, rooms, host, lobby) {
    const newRoom = io.of(`/${id}`);
    const usersRoom = {};

    newRoom.on('connection', function(socket) {
        let currentUser = {};

        // On connection to new room, all "sockets" currently connected
        // Should be emited data on new "socket" (user)

        // Grab details of user after emitting to newRoom
        socket.on('userDetails', (data) => { userConnect(data, id, currentUser, usersRoom, lobby, newRoom, host); }); 

        // Upon user adding "song" to queue
        socket.on('addQueue', (data) => { addQueue(data, newRoom, currentUser); });

        socket.on('skipTrack', () => { skipQueue(rooms, currentUser, newRoom) })
 
        socket.on('disconnect', () => { userDisconnect(usersRoom, currentUser, newRoom, id); });

        socket.on('changeSetting', (data) => { changeSetting(currentUser, data); });

        socket.on('refreshAccessToken', (data) => { refreshAccessToken(data, currentUser); });
    });
}