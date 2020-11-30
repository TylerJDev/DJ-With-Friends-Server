'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.clearSkipQueue = exports.skipQueue = undefined;

var _addQueue = require('./addQueue.js');

var _index = require('../store/index.js');

var skipQueue = exports.skipQueue = function skipQueue(rooms, currentUser, newRoom) {
    var currentRoom = _index.globalStore.rooms.findIndex(function (curr) {
        return curr.name === currentUser.active.roomID;
    });
    var skipTrack = function skipTrack() {
        _index.globalStore.rooms[currentRoom].queue.splice(0, 1);

        newRoom.emit('trackSkipped', { 'message': 'Track has been successfully skipped!', 'timeAgo': Date.now() });
        clearSkipQueue(_index.globalStore, currentRoom, newRoom);
        (0, _addQueue.playTrack)(_index.globalStore.rooms[currentRoom].queue[0], currentUser, _index.globalStore.rooms[currentRoom].host, newRoom, true);

        var hostValue = _index.globalStore.rooms[currentRoom].users.filter(function (curr) {
            return curr.id === _index.globalStore.rooms[currentRoom].host;
        });

        if (hostValue.length) {
            (0, _addQueue.pauseTrack)(hostValue[0].access_token);
        }
    };

    // If there are no tracks in the queue
    if (!_index.globalStore.rooms[currentRoom].queue.length) {
        newRoom.emit('trackSkipped', { 'error': 'No tracks in queue currently!' });
    }

    // Check if current user is the host
    if (currentUser.currentHost === true) {
        if (_index.globalStore.rooms[currentRoom].queue.length) {
            skipTrack();
        } else {
            console.error('[skipQueue.js:30] An error has occurred! Couldn\'t skip track!');
        }
    } else {
        // Add to room "skip" vote
        _index.globalStore.rooms[currentRoom].skipCount.add(currentUser.active.id);

        console.log('Voted to skip! Votes must reach at least ' + Math.ceil(_index.globalStore.rooms[currentRoom].users.length * 0.66) + ' to be skipped!');

        // Emit to room
        newRoom.emit('votedSkip', { 'currentVotes': _index.globalStore.rooms[currentRoom].skipCount, 'neededVotes': Math.ceil(_index.globalStore.rooms[currentRoom].users.length * 0.66) });

        // Vote must reach at least 66% of total users in room to be skipped
        if (_index.globalStore.rooms[currentRoom].skipCount.size >= Math.ceil(_index.globalStore.rooms[currentRoom].users.length * 0.66)) {
            skipTrack();
        }
    }
};

var clearSkipQueue = exports.clearSkipQueue = function clearSkipQueue(globalStore, currentRoom, newRoom) {
    if (globalStore.rooms[currentRoom] !== undefined) {
        globalStore.rooms[currentRoom].skipCount.clear();
        newRoom.emit('votedSkip', { 'currentVotes': 0, 'neededVotes': '' });
    }
};