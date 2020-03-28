'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.userDisconnect = undefined;

var _index = require('../store/index.js');

var userDisconnect = exports.userDisconnect = function userDisconnect(usersRoom, currentUser, newRoom, id) {
    var deleteRoom = function deleteRoom(rooms, currentUser, usersRoom) {
        // TEST: Ensure correct room is removed!
        delete usersRoom[currentUser.roomID];
        var findIndexRoom = rooms.findIndex(function (curr) {
            return curr.name === currentUser.roomID;
        });
        rooms.splice(findIndexRoom, 1);
    };

    if (currentUser.active === undefined || usersRoom[currentUser.active.roomID] === undefined) {
        return false;
    }

    // Check how many occurances of "user"
    var userOccur = usersRoom[currentUser.active.roomID].filter(function (curr) {
        return curr.id === currentUser.active.id;
    });

    // If the last occurance of user has left
    if (userOccur[0] !== undefined && userOccur[0].userCount === 1) {
        newRoom.emit('disconnected', currentUser.active.id);

        // Remove user from usersRoom array
        var userIndex = usersRoom[currentUser.active.roomID].findIndex(function (curr) {
            return curr.id === currentUser.active.id;
        });

        // Remove user from globalStore.rooms array
        var currentRoom = _index.globalStore.rooms.findIndex(function (curr) {
            return curr.name === currentUser.active.roomID;
        });
        if (_index.globalStore.rooms[currentRoom] !== undefined) {
            _index.globalStore.rooms[currentRoom].users.forEach(function (c, i) {
                if (c.id === currentUser.active.id) {
                    _index.globalStore.rooms[currentRoom].users.splice(i, 1);
                }
            });
        }

        if (userIndex > -1) {
            var emitData = { 'messageData': { 'message': 'User Left', 'type': 'info', 'name': currentUser.active.name, 'timeJoined': Date.now() }, 'users': usersRoom[id] };
            usersRoom[currentUser.active.roomID].splice(userIndex, 1);
            newRoom.emit('user', emitData);
        }

        // Check if room is empty
        if (!usersRoom[currentUser.active.roomID].length) {
            deleteRoom(_index.globalStore.rooms, currentUser.active, usersRoom);
        }
    } else if (userOccur[0] !== undefined) {
        usersRoom[currentUser.active.roomID].forEach(function (item, index) {
            if (item.id === [currentUser.active.id]) {
                usersRoom[currentUser.active.roomID][index].userCount -= 1;
            }
        });
    }
};