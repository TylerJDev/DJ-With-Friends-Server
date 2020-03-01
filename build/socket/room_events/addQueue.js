'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.clearFromQueue = exports.pauseTrack = exports.playTrack = exports.addQueue = undefined;

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _index = require('../store/index.js');

var _skipQueue = require('./skipQueue.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var addQueue = exports.addQueue = function addQueue(data, newRoom, currentUser) {
    var currentRoom = _index.globalStore.rooms.findIndex(function (curr) {
        return curr.name === currentUser.active.roomID;
    });

    // If queue empty, play track
    if (_index.globalStore.rooms[currentRoom].queue.length === 0) {
        playTrack(data, currentUser, _index.globalStore.rooms[currentRoom].host, newRoom);
    }

    // Add track to queue
    _index.globalStore.rooms[currentRoom].queue.push(data);

    // Emit to entire room 
    newRoom.emit('addedQueue', _index.globalStore.rooms[currentRoom].queue);
};

// Utilize Spotify API to handle "play" state
var playTrack = exports.playTrack = function playTrack(data, currentUser, roomHost, newRoom) {
    var skipped = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

    var currentRoom = void 0;

    if (currentUser === undefined || currentUser.active === undefined) {
        return false;
    }

    try {
        currentRoom = _index.globalStore.rooms.findIndex(function (curr) {
            return curr.name === currentUser.active.roomID;
        });
    } catch (TypeError) {
        return;
    }

    var userCurrent = {
        access_token: _index.globalStore.rooms[currentRoom] !== undefined ? _index.globalStore.rooms[currentRoom].users.filter(function (curr) {
            return curr.id === roomHost;
        })[0].accessToken : '',
        user: _index.globalStore.rooms[currentRoom] !== undefined ? _index.globalStore.rooms[currentRoom].users.filter(function (curr) {
            return curr.id === roomHost;
        })[0] : ''
    };

    if (_index.globalStore.rooms[currentRoom] === undefined) {
        console.log('err');
        console.log(_index.globalStore.rooms);
        console.log(currentRoom);
        console.log(currentUser.active);
    }

    var emptyQueue = { 'track': '', 'currentPlaying': false, 'artist': '', 'album': '', 'duration': '', 'timeStarted': 0, 'history': _index.globalStore.rooms[currentRoom].history };

    var validQueue = _index.globalStore.rooms[currentRoom].queue.length > 0;
    // Grab the next track in the queue
    var nextTrack = validQueue ? _index.globalStore.rooms[currentRoom].queue[0].trackURI : false;
    var nextTrackName = validQueue ? _index.globalStore.rooms[currentRoom].queue[0].trackName : '';
    var nextTrackArtist = validQueue ? _index.globalStore.rooms[currentRoom].queue[0].trackArtist : '';
    var nextTrackAlbum = validQueue ? _index.globalStore.rooms[currentRoom].queue[0].trackAlbum : '';
    var nextTrackAlbumImage = validQueue ? _index.globalStore.rooms[currentRoom].queue[0].trackAlbumImage !== undefined && _index.globalStore.rooms[currentRoom].queue[0].trackAlbumImage ? _index.globalStore.rooms[currentRoom].queue[0].trackAlbumImage : '' : '';

    var userDevices = [];
    var options = {};

    if (skipped === true) {
        _index.globalStore.rooms[currentRoom].timeCounts.forEach(function (current) {
            clearTimeout(current);
        });
        _index.globalStore.rooms[currentRoom].currentTrack = emptyQueue;
        newRoom.emit('currentTrack', _index.globalStore.rooms[currentRoom].currentTrack);
        newRoom.emit('addedQueue', _index.globalStore.rooms[currentRoom].queue);
    }

    if (nextTrack === false) {
        // Grab track from data passed
        if (data === undefined) {
            pauseTrack(userCurrent.access_token);
            newRoom.emit('currentTrack', emptyQueue);
            newRoom.emit('addedQueue', _index.globalStore.rooms[currentRoom].queue);
            return false;
        }
        nextTrack = data.trackURI;
        nextTrackName = data.trackName;
        nextTrackArtist = data.trackArtist;
        nextTrackAlbum = data.trackAlbum;
        nextTrackAlbumImage = data.trackAlbumImage;
    }

    //# DEV-NOTE: The user could be allowed to see which device to pick from if there are multiple devices
    //# This could be done via a modal popup using sockets to emit this data to the user
    try {
        userDevices = userCurrent.user.devices.devices.filter(function (curr) {
            return curr['is_restricted'] === false;
        });
        var deviceID = currentUser.active.mainDevice === null ? userDevices.length ? '?device_id=' + userDevices[0].id : '' : '?device_id=' + currentUser.active.mainDevice;

        options = {
            url: 'https://api.spotify.com/v1/me/player/play' + deviceID,
            headers: { 'Authorization': 'Bearer ' + userCurrent.access_token },
            body: JSON.stringify({
                "uris": [nextTrack]
            })
        };
    } catch (TypeError) {
        newRoom.emit('roomError', {
            'typeError': 'Couldn\'t find device(s)!', 'errorMessage': 'No devices were found'
        });

        return false;
    }

    console.log('Try to request');

    _request2.default.put(options, function (error, response, body) {
        var errorFound = '';

        try {
            var errorOf = JSON.parse(body)['error'];
            if (errorOf.hasOwnProperty('status')) {
                console.log('SIKE U THOUGHTR, seneding error thru!');
                console.log(userCurrent.access_token);
                newRoom.emit('roomError', {
                    'typeError': errorOf.status, 'errorMessage': errorOf.message
                });

                errorFound = true;
                clearFromQueue(currentRoom, nextTrack, newRoom);
                return false;
            }

            return true;
        } catch (SyntaxError) {
            errorFound = false;
        }

        // If there is no error with playing the track
        if (!errorFound) {
            var trackTimeout = setTimeout(function () {
                checkTrack();
            }, data.trackDuration - 10000);
            _index.globalStore.rooms[currentRoom].timeCounts.push(trackTimeout);

            // Emit current queue to room


            // Emit current track to room
            _index.globalStore.rooms[currentRoom].currentTrack = { 'track': nextTrackName, 'currentPlaying': true, 'artist': nextTrackArtist, 'album': nextTrackAlbum, 'albumImage': nextTrackAlbumImage, 'duration': data.trackDuration, 'timeStarted': Date.now(), 'queue': _index.globalStore.rooms[currentRoom].queue, 'history': _index.globalStore.rooms[currentRoom].history };
            newRoom.emit('addedQueue', _index.globalStore.rooms[currentRoom].queue);
            newRoom.emit('currentTrack', _index.globalStore.rooms[currentRoom].currentTrack);

            var checkTrack = function checkTrack() {

                // Check the current playback state 
                var playbackOptions = {
                    url: 'https://api.spotify.com/v1/me/player',
                    headers: { 'Authorization': 'Bearer ' + userCurrent.access_token }
                };

                _request2.default.get(playbackOptions, function (error, response, body) {
                    var trackDetails = JSON.parse(body);

                    // If track is playing, pause for room

                    // Check time versus data.trackDuration
                    console.log('Current duration: ' + trackDetails.progress_ms + ', Track duration: ' + data.trackDuration);

                    // Update client time progress
                    newRoom.emit('timeUpdate', { 'seconds': Math.floor(trackDetails.progress_ms / 1000) });
                    (0, _skipQueue.clearSkipQueue)(_index.globalStore, currentRoom, newRoom);

                    // if (trackDetails.progress_ms >= data.trackDuration - 10000) {
                    var timeLeft = data.trackDuration - trackDetails.progress_ms;
                    setTimeout(function () {
                        // Remove track from queue
                        clearFromQueue(currentRoom, nextTrack, newRoom);
                        // const trackIndex = globalStore.rooms[currentRoom].queue.findIndex(curr => curr.trackURI === nextTrack);
                        // newRoom.emit('removeFromQueue', globalStore.rooms[currentRoom].queue[trackIndex]);

                        // const removedTrack = globalStore.rooms[currentRoom].queue.splice(trackIndex, 1);
                        // globalStore.rooms[currentRoom].history.push(removedTrack);

                        playTrack(_index.globalStore.rooms[currentRoom].queue[0], currentUser, roomHost, newRoom);
                    }, timeLeft);
                    // }
                });
            };
        }
    });
};

var pauseTrack = exports.pauseTrack = function pauseTrack(access_token) {
    var options = {
        url: 'https://api.spotify.com/v1/me/player/pause',
        headers: { 'Authorization': 'Bearer ' + access_token }
    };

    _request2.default.put(options, function (error, resp, body) {
        console.log(error);
        console.log(body);
    });
};

var clearFromQueue = exports.clearFromQueue = function clearFromQueue(currentRoom, nextTrack, newRoom) {
    var trackIndex = _index.globalStore.rooms[currentRoom].queue.findIndex(function (curr) {
        return curr.trackURI === nextTrack;
    });
    newRoom.emit('removeFromQueue', _index.globalStore.rooms[currentRoom].queue[trackIndex]);

    var removedTrack = _index.globalStore.rooms[currentRoom].queue.splice(trackIndex, 1);
    _index.globalStore.rooms[currentRoom].history.push(removedTrack);
};