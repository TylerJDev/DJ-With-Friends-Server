'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.checkLock = undefined;

var _index = require('../store/index.js');

var _bcryptjs = require('bcryptjs');

var _bcryptjs2 = _interopRequireDefault(_bcryptjs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var checkLock = exports.checkLock = function checkLock(data, socket) {
    var currentRoom = _index.globalStore.rooms.findIndex(function (curr) {
        return String(curr.name) === data.roomID;
    });
    console.log(data);

    if (_index.globalStore.rooms[currentRoom] === undefined) {
        console.log('Yes, this room doesn\'t exist!');
        // pseudo code client.send('error', {'typeError': 'Room does not exist', 'errorMessage': 'Room ${roomId} does not exist!'})
        return false;
    }

    // Check the current room user limit
    if (_index.globalStore.rooms[currentRoom].settings['user-limit_'].length && _index.globalStore.rooms[currentRoom].users.length >= +_index.globalStore.rooms[currentRoom].settings['user-limit_'] && _index.globalStore.rooms[currentRoom].token !== data.token) {
        // pseudo code client.send('error', {'typeError': 'Room user limit', 'errorMessage': 'Room user limit has already been reached!'})        
        console.log('Room limit reached!');
        socket.emit('lockedRoom', {
            'userLimit': true
        });
        return false;
    }

    if (data.password === undefined) {
        if (currentRoom > -1 && _index.globalStore.rooms[currentRoom].hasOwnProperty('password')) {
            socket.emit('lockedRoom', {
                'passwordProtected': true,
                'roomName': _index.globalStore.rooms[currentRoom].settings['room_name'],
                'token': _index.globalStore.rooms[currentRoom].token
            });
        } else {
            socket.emit('lockedRoom', {
                'passwordProtected': false
            });
        }
    } else {
        _bcryptjs2.default.compare(data.password, _index.globalStore.rooms[currentRoom].password.hash, function (err, res) {
            socket.emit('passwordCheck', res);
        });
    }
};