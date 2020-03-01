'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.runSocket = undefined;

var _createUser = require('./events/createUser.js');

var _disconnect = require('./events/disconnect.js');

var _createRoom = require('./events/createRoom.js');

var _checkLock = require('./events/checkLock.js');

var _index = require('./store/index.js');

var store = _interopRequireWildcard(_index);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var runSocket = exports.runSocket = function runSocket(server, io) {
  var lobby = io.of('/rooms');
  var servStore = store.globalStore;
  servStore.lobby = lobby;

  /* 
  * To ensure that each user who joins the lobby
  * is placed in their own seperate room.
  * This allows for custom messages to be sent to
  * each user without sending to the entire lobby.
  */
  io.sockets.on('connection', function (socket) {
    socket.join(socket.id); // socket.id ensures unique room per user
    io.sockets.in(socket.id).emit('rooms', servStore.rooms);
  });

  lobby.on('connection', function (socket) {
    socket.on('create_user', function (user) {
      (0, _createUser.createUser)(user, socket, io);
    });
    socket.on('disconnect', function () {
      (0, _disconnect.disconnect)(socket);
    });
    socket.on('createRoom', function (data) {
      (0, _createRoom.createRoom)(data, socket, lobby, io);
    });
    socket.on('checkLock', function (data) {
      (0, _checkLock.checkLock)(data, socket);
    });
  });
};