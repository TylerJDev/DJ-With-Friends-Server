'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createRoom = undefined;

var _index = require('../store/index.js');

var _generateRoomID = require('../utils/generateRoomID.js');

var _bcryptjs = require('bcryptjs');

var _bcryptjs2 = _interopRequireDefault(_bcryptjs);

var _socket_room = require('../socket_room.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var createRoom = exports.createRoom = function createRoom(data, socket, lobby, io, socketID) {
    var randID = (0, _generateRoomID.randomIDGen)(_index.globalStore.rooms.map(function (cID) {
        return cID.name;
    }));
    var findExistingRooms = _index.globalStore.rooms.filter(function (curr) {
        return curr.id === data.id;
    });

    if (findExistingRooms.length) {
        socket.emit('roomError', {
            'typeError': 'Max rooms exceeded', 'errorMessage': 'You\'ve exceeded the max amount of rooms created!'
        });
        return false;
    }

    if (randID.typeError !== undefined) {
        socket.emit('roomError', randID);
        return false;
    }

    // 1. Check if proper room name`
    if (data.settings['room-name'].replace(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\\/?]/g, '').length < 3) {
        socket.emit('roomError', {
            'typeError': 'Room Character Limit', 'errorMessage': 'Room Name must be greater than 2 characters!'
        });
        return false;
    }

    // Name equals the ID of the room 
    data.name = randID;

    // Host of the current room
    var host = data.id;
    var addToRooms = function addToRooms() {
        var hash = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

        data.users = [];
        if (data.settings.hasOwnProperty('password')) {
            data.password = {
                'hash': hash
            };
            delete data.settings.password;
        }

        _index.globalStore.rooms.push(data);

        socket.emit('serverCreated', {
            'roomData': _index.globalStore.rooms,
            'roomID': randID,
            'host': host,
            'passwordProtected': data.settings.hasOwnProperty('password')
        });
        lobby.emit('servers', _index.globalStore.rooms);
    };

    if (data.settings.hasOwnProperty('password')) {
        // Hash password
        _bcryptjs2.default.hash(data.settings['password'], 10, function (err, hash) {
            addToRooms(hash);
            (0, _socket_room.socketRoom)(io, randID, _index.globalStore.rooms, host, lobby, socketID);
        });
    } else {
        addToRooms();
        (0, _socket_room.socketRoom)(io, randID, _index.globalStore.rooms, host, lobby, socketID);
    }
};