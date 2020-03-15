import { createUser } from './events/createUser.js';
import { disconnect } from './events/disconnect.js';
import { createRoom } from './events/createRoom.js';
import { checkLock } from './events/checkLock.js';
import * as store from './store/index.js';
import * as util from 'util';

export const runSocket = function(server, io) {
  const lobby = io.of('/rooms');
  let servStore = store.globalStore;
  servStore.lobby = lobby;

  /* 
  * To ensure that each user who joins the lobby
  * is placed in their own seperate room.
  * This allows for custom messages to be sent to
  * each user without sending to the entire lobby.
  */
  io.sockets.on('connection', function (socket) {
    let roomsData = [];
    socket.join(socket.id); // socket.id ensures unique room per user

    const target = {};
    const newRooms = Object.assign(target, servStore.rooms);

    if (servStore.rooms.length) {
      servStore.rooms.forEach((current) => {
        let newObj = {};

        Object.assign(newObj, current);

        delete newObj.users;
        delete newObj.skipCount;
        delete newObj.timeCounts;
        delete newObj.currentTrack;
        delete newObj.queue;
        delete newObj.trackHosts;
        delete newObj.pauseList;

        roomsData.push(JSON.stringify(newObj));
      });
      
      io.sockets.in(socket.id).emit('rooms', roomsData);
    }
  });

  lobby.on('connection', function(socket) {
    socket.on('create_user', (user) => { createUser(user, socket, io); });
    socket.on('disconnect', () => { disconnect(socket); });
    socket.on('createRoom', (data) => {createRoom(data, socket, lobby, io, socket.id)}); 
    socket.on('checkLock', (data) => { checkLock(data, socket)});
  });
}