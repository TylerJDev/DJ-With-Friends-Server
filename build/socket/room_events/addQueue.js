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
    var usersCurrent_host = void 0;
    var currentData = data;

    if (currentUser === undefined || currentUser.active === undefined) {
        return false;
    }

    try {
        currentRoom = _index.globalStore.rooms.findIndex(function (curr) {
            return curr.name === currentUser.active.roomID;
        });
        usersCurrent_host = _index.globalStore.rooms[currentRoom].users.filter(function (curr) {
            return curr.id === roomHost;
        })[0];
    } catch (TypeError) {
        return;
    }

    if (usersCurrent_host === undefined) {
        newRoom.emit('roomError', {
            'typeError': 'Couldn\'t find host user\'s access token!'
        });

        return false;
    }

    var userCurrent = {
        access_token: _index.globalStore.rooms[currentRoom] !== undefined ? usersCurrent_host.accessToken : '',
        user: _index.globalStore.rooms[currentRoom] !== undefined ? usersCurrent_host : ''
    };

    if (_index.globalStore.rooms[currentRoom] === undefined) {
        console.error('[addQueue.js:50] Could not find current room! Result for globalStore.rooms[currentRoom] is: ', _index.globalStore.rooms[currentRoom]);
        return false;
    }

    var emptyQueue = {
        'track': '',
        'currentPlaying': false,
        'artist': '',
        'album': '',
        'duration': '',
        'timeStarted': 0,
        'history': _index.globalStore.rooms[currentRoom].history
    };

    var validQueue = _index.globalStore.rooms[currentRoom].queue.length > 0;
    // Grab the next track in the queue
    var nextTrack = validQueue ? _index.globalStore.rooms[currentRoom].queue[0].trackURI : false;
    var nextTrackName = validQueue ? _index.globalStore.rooms[currentRoom].queue[0].trackName : '';
    var nextTrackArtist = validQueue ? _index.globalStore.rooms[currentRoom].queue[0].trackArtist : '';
    var nextTrackAlbum = validQueue ? _index.globalStore.rooms[currentRoom].queue[0].trackAlbum : '';
    var nextTrackAlbumImage = validQueue ? _index.globalStore.rooms[currentRoom].queue[0].trackAlbumImage !== undefined && _index.globalStore.rooms[currentRoom].queue[0].trackAlbumImage ? _index.globalStore.rooms[currentRoom].queue[0].trackAlbumImage : '' : '';
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
            _index.globalStore.rooms[currentRoom].trackHosts.forEach(function (current) {
                if (current.user.premium === 'true') pauseTrack(current.accessToken);
            });
            _index.globalStore.rooms[currentRoom].pauseList.forEach(function (current) {
                if (current.user.premium === 'true') pauseTrack(current.accessToken);
            });

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

    var makePlaybackQuery = function makePlaybackQuery(_ref) {
        var _ref$deviceID = _ref.deviceID,
            deviceID = _ref$deviceID === undefined ? '' : _ref$deviceID,
            _ref$accessToken = _ref.accessToken,
            accessToken = _ref$accessToken === undefined ? '' : _ref$accessToken;

        if (deviceID === '' || accessToken === '') {
            newRoom.emit('roomError', {
                'typeError': 'Couldn\'t find device(s)!',
                'errorMessage': 'No devices were found',
                'for': ''
            });

            // REQUEST FOR A NEW DEVICE ID .. 
            return false;
        }

        deviceID = '?device_id=' + deviceID;

        options = {
            url: 'https://api.spotify.com/v1/me/player/play' + deviceID,
            headers: {
                'Authorization': 'Bearer ' + accessToken
            },
            body: JSON.stringify({
                "uris": [nextTrack]
            })
        };

        return options;
    };

    var active = false;
    _index.globalStore.rooms[currentRoom].trackHosts.forEach(function (current) {
        var options = makePlaybackQuery(current);

        if (options) {
            _request2.default.put(options, function (error, response, body) {
                var premium_hosts = Array.from(_index.globalStore.rooms[currentRoom].trackHosts).filter(function (currentUser) {
                    return currentUser.user.premium === 'true';
                });

                if (body !== undefined && body.length) {
                    var errorOf = JSON.parse(body)['error'];

                    if (errorOf.hasOwnProperty('reason') && errorOf.reason === 'PREMIUM_REQUIRED' && !premium_hosts.length) {
                        newRoom.emit('roomError', {
                            'typeError': 'No eligible hosts!',
                            'errorMessage': 'Premium host is needed to play from the queue!'
                        });
                    } else {
                        console.log(body);
                    }

                    if (errorOf.hasOwnProperty('status')) {
                        if (_index.globalStore.rooms[currentRoom] === undefined || !Array.from(_index.globalStore.rooms[currentRoom].trackHosts).filter(function (currentUser) {
                            return currentUser.user.premium === 'true';
                        }).length) {
                            clearFromQueue(currentRoom, nextTrack, newRoom);
                            return false;
                        }
                    }
                }

                if (current.user.host) {
                    // If there is no error playing the track
                    var trackTimeout = setTimeout(function () {
                        checkTrack();
                    }, data.trackDuration - 10000);
                    _index.globalStore.rooms[currentRoom].timeCounts.push(trackTimeout);

                    // Emit current track to room
                    _index.globalStore.rooms[currentRoom].currentTrack = {
                        'track': nextTrackName,
                        'currentPlaying': true,
                        'artist': nextTrackArtist,
                        'album': nextTrackAlbum,
                        'albumImage': nextTrackAlbumImage,
                        'duration': data.trackDuration,
                        'timeStarted': Date.now(),
                        'queue': _index.globalStore.rooms[currentRoom].queue,
                        'history': _index.globalStore.rooms[currentRoom].history
                    };

                    newRoom.emit('addedQueue', _index.globalStore.rooms[currentRoom].queue);
                    newRoom.emit('currentTrack', _index.globalStore.rooms[currentRoom].currentTrack);

                    var checkTrack = function checkTrack() {
                        var currentAccess_token = userCurrent.access_token;
                        /* If the host isn't premium, the API call above will result in an error
                        To navigate this issue, find a host in the room whom is currently premium
                        */

                        if (currentUser.active.premium !== true) {
                            if (!premium_hosts.length) {
                                setTimeout(function () {
                                    clearFromQueue(currentRoom, nextTrack, newRoom);
                                }, 10000);

                                // Emit need for premium user
                                newRoom.emit('roomError', {
                                    'typeError': 'No eligible hosts!',
                                    'errorMessage': 'Premium host is needed to play from the queue!'
                                });

                                _index.globalStore.rooms[currentRoom].noHost = true;
                                _index.globalStore.rooms[currentRoom].playData = {
                                    'queueCurrent': _index.globalStore.rooms[currentRoom].queue[0],
                                    'currentUser': currentUser,
                                    'roomHost': roomHost,
                                    'newRoom': newRoom,
                                    'currentData': currentData
                                };

                                return false;
                            } else {
                                currentAccess_token = premium_hosts[0].accessToken;

                                if (_index.globalStore.rooms[currentRoom] !== undefined && _index.globalStore.rooms[currentRoom].noHost === true) _index.globalStore.rooms[currentRoom].noHost = false;
                            }
                        }

                        // Check the current playback state 
                        var playbackOptions = {
                            url: 'https://api.spotify.com/v1/me/player',
                            headers: {
                                'Authorization': 'Bearer ' + currentAccess_token
                            }
                        };

                        if (active === false) {
                            active = true;
                            _request2.default.get(playbackOptions, function (error, response, body) {
                                var trackDetails = JSON.parse(body);
                                // Check time versus data.trackDuration
                                console.log('Current duration: ' + trackDetails.progress_ms + ', Track duration: ' + data.trackDuration);

                                // Update client time progress
                                newRoom.emit('timeUpdate', {
                                    'seconds': Math.floor(trackDetails.progress_ms / 1000)
                                });
                                (0, _skipQueue.clearSkipQueue)(_index.globalStore, currentRoom, newRoom);
                                var timeLeft = data.trackDuration - trackDetails.progress_ms;
                                setTimeout(function () {
                                    // Remove track from queue

                                    if (_index.globalStore.rooms[currentRoom] !== undefined) {
                                        premium_hosts = Array.from(_index.globalStore.rooms[currentRoom].trackHosts).filter(function (currentUser) {
                                            return currentUser.user.premium === 'true';
                                        });
                                    } else {
                                        premium_hosts = [];
                                    }

                                    clearFromQueue(currentRoom, nextTrack, newRoom);

                                    if (premium_hosts.length) {
                                        playTrack(_index.globalStore.rooms[currentRoom].queue[0], currentUser, roomHost, newRoom);
                                    } else {
                                        if (_index.globalStore.rooms[currentRoom].queue[0] !== undefined) {
                                            _index.globalStore.rooms[currentRoom].noHost = true;
                                            _index.globalStore.rooms[currentRoom].playData = {
                                                'queueCurrent': _index.globalStore.rooms[currentRoom].queue[0],
                                                'currentUser': currentUser,
                                                'roomHost': roomHost,
                                                'newRoom': newRoom,
                                                'currentData': currentData
                                            };
                                        }
                                    }
                                }, timeLeft);
                            });
                        }
                    };
                }
            });
        }
    });
};

var pauseTrack = exports.pauseTrack = function pauseTrack(access_token) {
    var options = {
        url: 'https://api.spotify.com/v1/me/player/pause',
        headers: {
            'Authorization': 'Bearer ' + access_token
        }
    };

    _request2.default.put(options, function (error, resp, body) {
        console.log(body);
    });
};

var clearFromQueue = exports.clearFromQueue = function clearFromQueue(currentRoom, nextTrack, newRoom) {
    var trackIndex = _index.globalStore.rooms[currentRoom].queue.findIndex(function (curr) {
        return curr.trackURI === nextTrack;
    });

    if (trackIndex !== -1) {
        newRoom.emit('removeFromQueue', _index.globalStore.rooms[currentRoom].queue[trackIndex]);
    } else {
        trackIndex = 0;
        newRoom.emit('addedQueue', _index.globalStore.rooms[currentRoom].queue);
    }

    var removedTrack = _index.globalStore.rooms[currentRoom].queue.splice(trackIndex, 1);
    _index.globalStore.rooms[currentRoom].history.push(removedTrack);

    // Clear any users on "pausedList"
    _index.globalStore.rooms[currentRoom].pauseList.forEach(function (current) {
        pauseTrack(current.accessToken);
    });
};