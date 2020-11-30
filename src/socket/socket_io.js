import { createUser } from './events/createUser.js';
import { disconnect } from './events/disconnect.js';
import { createRoom } from './events/createRoom.js';
import { checkLock } from './events/checkLock.js';
import * as store from './store/index.js';
import * as util from 'util';
import * as admin from 'firebase-admin';
import serviceAccount from '../../dj-with-friends-firebase-adminsdk.json';

serviceAccount.type = process.env.type;
serviceAccount.project_id = process.env.project_id;
serviceAccount.private_key_id = process.env.private_key_id;
serviceAccount.private_key = process.env.private_key.replace(/\\n/g, '\n');
serviceAccount.client_email = process.env.client_email;
serviceAccount.client_id = process.env.client_id_fs;
serviceAccount.client_x509_cert_url = process.env.client_x509_cert_url;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://dj-with-friends-3097e.firebaseio.com'
});

export const db = admin.firestore();

export const runSocket = function(server, io) {
  const lobby = io.of('/rooms');
  let servStore = store.globalStore;
  let test = [];
  servStore.lobby = lobby;

  /* 
  * To ensure that each user who joins the lobby
  * is placed in their own separate room.
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
        let users = newObj.users;
        let userImages;
        Object.assign(newObj, current);   

        users = newObj.users.map((current) => {
          return current.name;
        });

        userImages = newObj.users.map((current) => {
          if (typeof current.image === 'object' && current.image.hasOwnProperty('imageID') && typeof current.image.imageID === 'string') {
            return current.image.imageID;
          } else {
            return '';
          }
        })

        delete newObj.users;
        delete newObj.skipCount;
        delete newObj.timeCounts;
        delete newObj.currentTrack;
        delete newObj.queue;
        delete newObj.trackHosts;
        delete newObj.pauseList;
        delete newObj.hostSocketID;
        delete newObj.noHost;
        delete newObj.playData;

        newObj.users = users;
        newObj.userImages = userImages;
        roomsData.push(JSON.stringify(newObj));
      });
      
      io.sockets.in(socket.id).emit('rooms', roomsData);
    } else {
      io.sockets.in(socket.id).emit('rooms', []);
    }
  });

  lobby.on('connection', function(socket) {
    socket.on('create_user', (user) => { createUser(user, socket, io); });
    socket.on('disconnect', () => { disconnect(socket); });
    socket.on('createRoom', (data) => {createRoom(data, socket, lobby, io, socket.id, db)}); 
    socket.on('checkLock', (data) => { checkLock(data, socket)});
  });
}