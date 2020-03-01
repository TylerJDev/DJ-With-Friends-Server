'use strict';

Object.defineProperty(exports, "__esModule", {
        value: true
});
exports.socketRoom = undefined;

var _userConnect = require('./room_events/userConnect.js');

var _userDisconnect = require('./room_events/userDisconnect.js');

var _addQueue = require('./room_events/addQueue.js');

var _skipQueue = require('./room_events/skipQueue.js');

var _changeSetting = require('./room_events/changeSetting.js');

var _refreshAccessToken = require('./room_events/refreshAccessToken.js');

var socketRoom = exports.socketRoom = function socketRoom(io, id, rooms, host, lobby) {
        var newRoom = io.of('/' + id);
        var usersRoom = {};

        newRoom.on('connection', function (socket) {
                var currentUser = {};

                // On connection to new room, all "sockets" currently connected
                // Should be emited data on new "socket" (user)

                // Grab details of user after emitting to newRoom
                socket.on('userDetails', function (data) {
                        (0, _userConnect.userConnect)(data, id, currentUser, usersRoom, lobby, newRoom, host);
                });

                // Upon user adding "song" to queue
                socket.on('addQueue', function (data) {
                        (0, _addQueue.addQueue)(data, newRoom, currentUser);
                });

                socket.on('skipTrack', function () {
                        (0, _skipQueue.skipQueue)(rooms, currentUser, newRoom);
                });

                socket.on('disconnect', function () {
                        (0, _userDisconnect.userDisconnect)(usersRoom, currentUser, newRoom, id);
                });

                socket.on('changeSetting', function (data) {
                        (0, _changeSetting.changeSetting)(currentUser, data);
                });

                socket.on('refreshAccessToken', function (data) {
                        (0, _refreshAccessToken.refreshAccessToken)(data, currentUser);
                });
        });
};