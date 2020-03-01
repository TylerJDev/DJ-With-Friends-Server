'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.userConnect = undefined;

var _index = require('../store/index.js');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var userConnect = exports.userConnect = function userConnect(data, id, currentUser, usersRoom, lobby, newRoom, host) {
    var User = function User(name, id, userCount, accessToken, devices, timeJoined, roomID, host, mainDevice) {
        _classCallCheck(this, User);

        this.name = name;
        this.id = id;
        this.userCount = userCount;
        this.accessToken = accessToken;
        this.devices = devices;
        this.timeJoined = timeJoined;
        this.roomID = roomID;
        this.host = host;
        this.mainDevice = mainDevice;
    };

    var user = new User(data.display_name, data.id, 1, data.access_token, JSON.parse(data.devices), Date.now(), id, data.id === host, data.mainDevice);

    if (usersRoom[id] === undefined) {
        usersRoom[id] = [];
    }

    var usersPreExist = usersRoom[id].find(function (curr) {
        return curr.id === data.id;
    });
    currentUser.active = user;

    var currentRoom = _index.globalStore.rooms.findIndex(function (curr) {
        return curr.name === currentUser.active.roomID;
    });
    if (usersPreExist === undefined) {
        usersRoom[id].push(user);

        // Update lobby
        //lobby.emit('updateLobby', globalStore.rooms);
        // Add user to "globalStore.rooms.user" array
        if (_index.globalStore.rooms[currentRoom] !== undefined) {
            if (_index.globalStore.rooms[currentRoom].hasOwnProperty('users') === false) {
                _index.globalStore.rooms[currentRoom].users = [];
            }

            _index.globalStore.rooms[currentRoom].users.push(user);
            // Add queue to room if not current
            if (_index.globalStore.rooms[currentRoom].hasOwnProperty('queue') === false) {
                _index.globalStore.rooms[currentRoom].queue = [];
                _index.globalStore.rooms[currentRoom].history = [];
                _index.globalStore.rooms[currentRoom].skipCount = new Set();
                _index.globalStore.rooms[currentRoom].currentTrack = { 'track': '', 'currentPlaying': false, 'artist': '' };
                _index.globalStore.rooms[currentRoom].host = host;
                _index.globalStore.rooms[currentRoom].timeCounts = [];
            }
        }
    } else {
        // Add instance count to user object
        usersRoom[id].forEach(function (item, index) {
            if (item.id === data.id) {
                usersRoom[id][index].userCount += 1;
            }
        });
    }

    var emitData = { 'messageData': { 'message': 'User Joined', 'type': 'info', 'name': user.name, 'timeJoined': Date.now() }, 'users': usersRoom[id] };
    newRoom.emit('user', emitData);
    newRoom.emit('currentTrack', _index.globalStore.rooms[currentRoom].currentTrack);
};