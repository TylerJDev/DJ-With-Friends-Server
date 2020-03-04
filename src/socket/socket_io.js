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
    
    // if (servStore.rooms.length) {
    //   servStore.rooms.forEach((current) => {
    //     roomsData.push(util.inspect(current).replace(/[']/g, '"'));
    //     //roomsData.push(JSON.stringify(current));
    //   });
    //   io.sockets.in(socket.id).emit('rooms', roomsData);
    // }
  });

  lobby.on('connection', function(socket) {
    socket.on('create_user', (user) => { createUser(user, socket, io); });
    socket.on('disconnect', () => { disconnect(socket); });
    socket.on('createRoom', (data) => {createRoom(data, socket, lobby, io)}); 
    socket.on('checkLock', (data) => { checkLock(data, socket)});
  });
}