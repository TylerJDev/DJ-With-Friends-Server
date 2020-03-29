'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.userHosts = undefined;

var _index = require('../store/index.js');

var _addQueue = require('./addQueue.js');

var userHosts = exports.userHosts = function userHosts(currentUser) {
    var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var newRoom = arguments[2];

    var currentRoom = _index.globalStore.rooms.findIndex(function (curr) {
        return curr.name === currentUser.active.roomID;
    });

    var checkHostUser = function checkHostUser(hostObj) {
        if (!hostObj.hasOwnProperty('host')) {
            return false;
        }

        _index.globalStore.rooms[currentRoom].users.forEach(function (current) {
            if (current.accessToken === currentUser.active.accessToken) {
                current.host = data.host;
            }
        });
    };

    if (!data.hasOwnProperty('host') || data.host === true) {
        checkHostUser(data);
        if (currentUser.hasOwnProperty('host') && currentUser.host === false || !currentUser.active.accessToken.length && !currentUser.hasOwnProperty('host') || !currentUser.active.devices.devices.length && !currentUser.hasOwnProperty('host')) {
            return false;
        }

        var currentDevice = currentUser.active.devices.devices.length ? currentUser.active.devices.devices.filter(function (current) {
            return current.is_active;
        })[0] : '';

        if (currentDevice !== undefined && currentDevice !== '') {
            currentDevice = currentDevice.id;
        } else if (currentDevice === undefined) {
            currentDevice = '';
        }

        _index.globalStore.rooms[currentRoom].trackHosts.add({ 'deviceID': currentDevice, 'accessToken': currentUser.active.accessToken, 'user': currentUser.active });

        if (_index.globalStore.rooms[currentRoom].noHost && _index.globalStore.rooms[currentRoom].playData.currentUser !== undefined) {
            _index.globalStore.rooms[currentRoom].noHost = false;

            // Remove duplicate addition
            _index.globalStore.rooms[currentRoom].queue.shift();

            _index.globalStore.rooms[currentRoom].queue.push(_index.globalStore.rooms[currentRoom].playData.queueCurrent);

            // Reverse queue
            _index.globalStore.rooms[currentRoom].queue.reverse();

            // Emit to entire room 
            newRoom.emit('addedQueue', _index.globalStore.rooms[currentRoom].queue);

            (0, _addQueue.playTrack)(_index.globalStore.rooms[currentRoom].playData.queueCurrent, _index.globalStore.rooms[currentRoom].playData.currentUser, _index.globalStore.rooms[currentRoom].playData.roomHost, _index.globalStore.rooms[currentRoom].playData.newRoom);
        }
    } else {
        checkHostUser(data);
        _index.globalStore.rooms[currentRoom].trackHosts.forEach(function (current) {
            if (current.user.accessToken === currentUser.active.accessToken) {
                // Add user to pause list
                _index.globalStore.rooms[currentRoom].pauseList.add(current);
                _index.globalStore.rooms[currentRoom].trackHosts.delete(current);
            }
        });
    }
};