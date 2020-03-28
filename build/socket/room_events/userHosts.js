'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.userHosts = undefined;

var _index = require('../store/index.js');

var userHosts = exports.userHosts = function userHosts(currentUser) {
    var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

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
        })[0].id : '';

        _index.globalStore.rooms[currentRoom].trackHosts.add({ 'deviceID': currentDevice, 'accessToken': currentUser.active.accessToken, 'user': currentUser.active });
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