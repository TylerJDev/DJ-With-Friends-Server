/* eslint-disable */
import request from 'request'
import { globalStore } from '../store/index';
import { clearSkipQueue } from './skipQueue';
import winston from '../../../config/winston';
import {db} from '../socket_io';
import * as admin from 'firebase-admin';

export const addQueue = (data, newRoom, currentUser, roomRef) => {
    let currentRoom = globalStore.rooms.findIndex(curr => curr.name === currentUser.active.roomID);

    (async function() {
        const dbQueue = roomRef.get().then(async function(doc) {
            const main = {
                data: data,
                currentUser: currentUser,
                currentRoomHost: globalStore.rooms[currentRoom].host,
                newRoom: newRoom,
                skipped: false,
                roomRef: roomRef,
                hostUID: null,
            }

            if (doc.exists) {
                main.hostUID = doc.data().hostUID;

                // globalStore.rooms[currentRoom].queue.push(data);
                const trackAdd = roomRef.collection('roomQueue').doc('currentQueue').update({
                    queue: admin.firestore.FieldValue.arrayUnion({
                        trackURI: String(data.trackURI),
                        trackTitle: String(data.track),
                        artist: [...data.artist],
                        trackDuration: Number(data.duration),
                        albumTitle: String(data.album),
                        albumImages: Array.isArray(data.albumImage) === true ? data.albumImage : null,
                        whoQueued: String(data.whoQueued),
                        // timestamp: db.FieldValue.serverTimestamp(),
                        // TODO: Add expiresAt field, timestamp
                    })
                }).then(() => {
                    return playTrack(main);
                });

                return await trackAdd;
                 //data, currentUser, globalStore.rooms[currentRoom].host, newRoom, false, roomRef, doc.data().hostUID);
            } else {
                winston.error('Firestore: Document does not exist!');
                return false; // TODO: Should we resolve reject?
            }
        }).then((callValue) => {;
            if (callValue) {
                // Emit to entire room 
                // newRoom.emit('addedQueue', globalStore.rooms[currentRoom].queue);
            } else {
                console.log('Emit data to room'); // TODO: resolve?
            }
        }).catch(e => {
            winston.error(e); // TODO:
        });
    })();
};

// REFACTOR: Put in own file
export const playTrack = ({data, currentUser, roomHost, newRoom, skipped, roomRef, hostUID}) => {
    const currentData = data;
    let currentRoom;
    let usersCurrent_host;
    if (currentUser === undefined || currentUser.active === undefined) {
        return;
    }

    const emptyQueue = {
        'track': '',
        'currentPlaying': false,
        'artist': '',
        'album': '',
        'duration': '',
        'timeStarted': 0,
        //'history': globalStore.rooms[currentRoom].history
    };

    // REFACTOR: 
    // let validQueue = globalStore.rooms[currentRoom].queue.length > 0;
    // Grab the next track in the queue
    /* let nextTrack = validQueue ? globalStore.rooms[currentRoom].queue[0].trackURI : false;
    let nextTrackName = validQueue ? globalStore.rooms[currentRoom].queue[0].track : '';
    let nextTrackArtist = validQueue ? globalStore.rooms[currentRoom].queue[0].artist : '';
    let nextTrackAlbum = validQueue ? globalStore.rooms[currentRoom].queue[0].album : '';
    let nextTrackAlbumImage = validQueue ? (globalStore.rooms[currentRoom].queue[0].albumImage !== undefined && globalStore.rooms[currentRoom].queue[0].albumImage) ? globalStore.rooms[currentRoom].queue[0].albumImage : '' : '';
    let options = {};
    

    if (skipped === true) {
        globalStore.rooms[currentRoom].timeCounts.forEach((current) => {
            clearTimeout(current)
        });
        globalStore.rooms[currentRoom].currentTrack = emptyQueue;
        newRoom.emit('currentTrack', globalStore.rooms[currentRoom].currentTrack);
        newRoom.emit('addedQueue', globalStore.rooms[currentRoom].queue);
    }

    if (nextTrack === false) {
        // Grab track from data passed
        if (data === undefined) {
            globalStore.rooms[currentRoom].trackHosts.forEach((current) => {
                if (current.user.premium === 'true') pauseTrack(current.accessToken);
            });
            globalStore.rooms[currentRoom].pauseList.forEach((current) => {
                if (current.user.premium === 'true') pauseTrack(current.accessToken);
            });

            newRoom.emit('currentTrack', emptyQueue);
            newRoom.emit('addedQueue', globalStore.rooms[currentRoom].queue);
            return false;
        }
        nextTrack = data.trackURI;
        nextTrackName = data.track;
        nextTrackArtist = data.artist;
        nextTrackAlbum = data.album;
        nextTrackAlbumImage = data.albumImage;
    }*/

    db.collection('users').doc(hostUID).get().then(async (docData) => {
        const {accessToken} = docData.data();

        if (accessToken) {
            const userCurrent = {access_token: accessToken};
            const currentTrack = roomRef.get().then(currentData => {
                return {trackNow: currentData.data().currentTrack, roomQueue: currentData.data().roomQueue};
            });
            
            return await currentTrack; 
        } else {
            throw new Error("Couldn't find user's access token!");
        }
    }).then(async (data) => {
        if (data.trackNow === null) {
            // Grab currentQueue from firestore
            const track = roomRef.collection('roomQueue').doc('currentQueue').get().then((queueData) => {
                const queueArr = [...queueData.data().queue];
                const newCurrentTrack = queueArr.shift();

                // Remove the track from queue
                roomRef.collection('roomQueue').doc('currentQueue').set({queue: queueArr});
                roomRef.update({
                    currentTrack: newCurrentTrack,
                });

                return newCurrentTrack;
            });

            return await track;
        } else {
            // REFACTOR: Do something here & return
            console.log('handle');
        }
    }).then((trackData) => {


        
    }).catch(e => {
        winston.error(e);
        // Refactor: send something to room
    });

    const makePlaybackQuery = ({
        deviceID = '',
        accessToken = ''
    }) => {
        if (deviceID === '' || accessToken === '') {
            newRoom.emit('roomError', {
                'typeError': 'Couldn\'t find device(s)!',
                'errorMessage': 'No devices were found',
                'for': ''
            });

            // REQUEST FOR A NEW DEVICE ID .. 
            return false;
        }

        deviceID = `?device_id=${deviceID}`;

        options = {
            url: `https://api.spotify.com/v1/me/player/play${deviceID}`,
            headers: {
                'Authorization': 'Bearer ' + accessToken
            },
            body: JSON.stringify({
                "uris": [nextTrack],
            })
        }

        return options;
    }

    let active = false;
    globalStore.rooms[currentRoom].trackHosts.forEach((current) => {
        const options = makePlaybackQuery(current);
        if (options) {
            request.put(options, function (error, response, body) {
                let premium_hosts = Array.from(globalStore.rooms[currentRoom].trackHosts).filter(currentUser => currentUser.user.premium === 'true');

                if (body !== undefined && body.length) {
                    let errorOf = JSON.parse(body)['error'];


                    if (errorOf.hasOwnProperty('reason') && errorOf.reason === 'PREMIUM_REQUIRED' && !premium_hosts.length) {
                        newRoom.emit('roomError', {
                            'typeError': 'No eligible hosts!',
                            'errorMessage': 'Premium host is needed to play from the queue!'
                        });
                    }  else {
                        // This may be hit if the user's access token has expired
                        winston.error(`Room - Error has likely occurred ${JSON.stringify(body)}`);
                        // Add condition if body has reauth error
                        newRoom.emit('reAuth', {
                            'user': current.user.id,
                        });
                    }

                    if (errorOf.hasOwnProperty('status')) {
                        if (globalStore.rooms[currentRoom] === undefined || !Array.from(globalStore.rooms[currentRoom].trackHosts).filter(currentUser => currentUser.user.premium === 'true').length) {
                            clearFromQueue(currentRoom, nextTrack, newRoom);
                            return false;
                        }
                    }
                }

                if (current.user.host) {
                    // If there is no error playing the track
                    let trackTimeout = setTimeout(() => {
                        checkTrack()
                    }, data.duration - 10000);
                    globalStore.rooms[currentRoom].timeCounts.push(trackTimeout);

                    // Emit current track to room
                    globalStore.rooms[currentRoom].currentTrack = {
                        'track': nextTrackName,
                        'currentPlaying': true,
                        'artist': nextTrackArtist,
                        'album': nextTrackAlbum,
                        'albumImage': validateAlbumImage(nextTrackAlbumImage),
                        'duration': data.duration,
                        'timeStarted': Date.now(),
                        'queue': globalStore.rooms[currentRoom].queue,
                        'history': globalStore.rooms[currentRoom].history,
                        'trackURI': nextTrack
                    };

                    newRoom.emit('addedQueue', globalStore.rooms[currentRoom].queue);
                    newRoom.emit('currentTrack', globalStore.rooms[currentRoom].currentTrack);

                    const checkTrack = () => {
                        let currentAccess_token = userCurrent.access_token;
                        /* If the host isn't premium, the API call above will result in an error
                        To navigate this issue, find a host in the room whom is currently premium
                        */

                        if (currentUser.active.premium !== true) {
                            if (!premium_hosts.length) {
                                setTimeout(() => {
                                    clearFromQueue(currentRoom, nextTrack, newRoom);
                                }, 10000);

                                // Emit need for premium user
                                newRoom.emit('roomError', {
                                    'typeError': 'No eligible hosts!',
                                    'errorMessage': 'Premium host is needed to play from the queue!'
                                });

                                globalStore.rooms[currentRoom].noHost = true;
                                globalStore.rooms[currentRoom].playData = {
                                    'queueCurrent': globalStore.rooms[currentRoom].queue[0],
                                    'currentUser': currentUser,
                                    'roomHost': roomHost,
                                    'newRoom': newRoom,
                                    'currentData': currentData
                                };

                                return false;
                            } else {
                                currentAccess_token = premium_hosts[0].accessToken;

                                if (globalStore.rooms[currentRoom] !== undefined && globalStore.rooms[currentRoom].noHost === true)
                                    globalStore.rooms[currentRoom].noHost = false;
                            }
                        }

                        // Check the current playback state 
                        const playbackOptions = {
                            url: 'https://api.spotify.com/v1/me/player',
                            headers: {
                                'Authorization': 'Bearer ' + currentAccess_token
                            },
                        }

                        if (active === false) {
                            active = true;
                            request.get(playbackOptions, function (error, response, body) {
                                const trackDetails = JSON.parse(body);
                                // Check time versus data.duration
                                winston.info(`Room - Room: ${globalStore.rooms[currentRoom].name}, Current duration: ${trackDetails.progress_ms}, Track duration: ${data.duration}`);

                                // Update client time progress
                                newRoom.emit('timeUpdate', {
                                    'seconds': Math.floor(trackDetails.progress_ms / 1000)
                                });
                                clearSkipQueue(globalStore, currentRoom, newRoom);
                                const timeLeft = (data.duration - trackDetails.progress_ms);
                                setTimeout(function () {
                                    // Remove track from queue

                                    if (globalStore.rooms[currentRoom] !== undefined) {
                                        premium_hosts = Array.from(globalStore.rooms[currentRoom].trackHosts).filter(currentUser => currentUser.user.premium === 'true');
                                    } else {
                                        premium_hosts = [];
                                    }

                                    clearFromQueue(currentRoom, nextTrack, newRoom);

                                    if (premium_hosts.length) {
                                        playTrack(globalStore.rooms[currentRoom].queue[0], currentUser, roomHost, newRoom);
                                    } else {
                                        if (globalStore.rooms[currentRoom] !== undefined && globalStore.rooms[currentRoom].queue[0] !== undefined) {
                                            globalStore.rooms[currentRoom].noHost = true;
                                            globalStore.rooms[currentRoom].playData = {
                                                'queueCurrent': globalStore.rooms[currentRoom].queue[0],
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
                    }
                }
            });
        }
    });
}

// REFACTOR: Put in utils/ (ensure no other file is dependant on this, but on utils/)
export const pauseTrack = (access_token) => {
    const options = {
        url: 'https://api.spotify.com/v1/me/player/pause',
        headers: {
            'Authorization': 'Bearer ' + access_token
        },
    }

    request.put(options, function (error, resp, body) {
        if (error) {
            winston.error(error);
        }
    });

}

// REFACTOR: Put in utils/
export const clearFromQueue = (currentRoom, nextTrack, newRoom) => {
    if (globalStore.rooms[currentRoom] === undefined) {
        return false;
    }
    
    let trackIndex = globalStore.rooms[currentRoom].queue.findIndex(curr => curr.trackURI === nextTrack);

    if (trackIndex !== -1) {
        newRoom.emit('removeFromQueue', globalStore.rooms[currentRoom].queue[trackIndex]);
    } else {
        trackIndex = 0;
        newRoom.emit('addedQueue', globalStore.rooms[currentRoom].queue);
    }

    const removedTrack = globalStore.rooms[currentRoom].queue.splice(trackIndex, 1);
    globalStore.rooms[currentRoom].history.push(removedTrack);

    if (!globalStore.rooms[currentRoom].queue.length) {
        globalStore.rooms[currentRoom].trackHosts.forEach((current) => {
            if (current.user.premium === 'true' || current.user.premium === true) pauseTrack(current.accessToken);
        });

        globalStore.rooms[currentRoom].pauseList.forEach((current) => {
            pauseTrack(current.accessToken);
        });
    }
}

// REFACTOR: Put in utils/
const validateAlbumImage = (src) => {
    // Array is expected from passed value {src}
    if (!src.length) {
        return '';
    }

    let newSrc = src.filter((current) => {
        if (current.url.indexOf('https://i.scdn.co/image/') === 0 && current.url.replace('https://i.scdn.co/image/', '').length === 40) {
            return current;
        }
    });

    return newSrc;
}

// REFACTOR: Put in utils/
export const startFromPosition = (accessToken, deviceID, position, trackURI, pause=false)  => {
    // This function allows player to start from set position
    // This will be used in order to start the track from the set position if user has to re-auth

    const playerOptions = {
        url: `https://api.spotify.com/v1/me/player/play?device_id=${deviceID}`,
        headers: {
            'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify({
            "uris": [trackURI],
            "position_ms": position
        })
    }

    request.put(playerOptions, function (error, response, body) {
        if (error) {
            try {
                winston.error(JSON.stringify(error));
            } catch(e) {
                return;
            }
        }
    });
}