/* eslint-disable */
import request from 'request'
import { globalStore } from '../store/index';
import { clearSkipQueue } from './skipQueue';
import winston from '../../../config/winston';
import {db} from '../socket_io';
import * as admin from 'firebase-admin';
import {startFromPosition} from '../../utils/startFromPosition.js';
import {exportCurrentTrack} from '../../utils/exportCurrentTrack';
import {setTimer} from '../../utils/setTimer';

export const addQueue = (data, newRoom, currentUser, roomRef) => {
    const currentRoom = globalStore.rooms.findIndex(curr => curr.name === currentUser.active.roomID);

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
                currentRoom: currentRoom,
            }

            if (doc.exists) {
                main.hostUID = doc.data().hostUID;
                const trackAdd = roomRef.collection('roomQueue').doc('currentQueue').update({
                    queue: admin.firestore.FieldValue.arrayUnion({
                        trackURI: String(data.trackURI),
                        trackTitle: String(data.track),
                        artist: [...data.artist],
                        trackDuration: Number(data.duration),
                        albumTitle: String(data.album),
                        albumImage: Array.isArray(data.albumImage) === true ? data.albumImage : null,
                        whoQueued: String(data.whoQueued),
                        // timestamp: db.FieldValue.serverTimestamp(),
                        // TODO: Add expiresAt field, timestamp
                    })
                }).then(() => {
                    return playTrack(main);
                });

                return await trackAdd;
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
export const playTrack = ({data, currentUser, roomHost, newRoom, skipped, roomRef, hostUID, currentRoom}) => {
    const currentData = data;
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

                newRoom.emit('addedQueue', {queueData: queueArr});

                globalStore.rooms[currentRoom].queue = queueArr;
                return [newCurrentTrack, queueArr];
            });

            return await track;
        } else {
            // REFACTOR: Do something here & return
            roomRef.collection('roomQueue').doc('currentQueue').get().then((queueData) => {
                newRoom.emit('addedQueue', {queueData: [...queueData.data().queue]});
                globalStore.rooms[currentRoom].queue = queueData.data().queue;
            });

            // Promise.reject(null);
            throw new Error(null); // Refactor: use reject instead
        }
    }).then(async (trackData) => {
        const users = roomRef.collection('roomUsers').doc('activeUsers').get().then(async (userData) => {
            const activeUsers = userData.data().users;

            const premUsers = Promise.all(activeUsers.map(async (curr) => {
                const res = await curr.get();
                const data = await res.data();
                if (data.premium === true) {
                    return await data;
                } else {
                    return false;
                }
            }));

            return await [premUsers, trackData[0], trackData[1]];
        });

        return await users;
    }).then(async (userData) => {
        userData[0] = await userData[0].then((data) => {
            return data;  
        });

        // Since we're getting the most recent data -
        // we can clear accessStore

        globalStore.rooms[currentRoom].accessStore = {};

        if (!userData[0].length) {
            newRoom.emit('roomError', {
                'typeError': 'No eligible hosts!',
                'errorMessage': 'Premium host is needed to play from the queue!'
            });
        
            return;
        }

        const duration = userData[1].trackDuration;
        const users = userData[0];

        setTrack(users, userData[1], currentRoom, newRoom);
        return await setTrackTime(duration, users, roomRef, currentRoom, newRoom);
    }).catch(e => {
        winston.error(e);
        // Refactor: send something to room
    });

    let active = false;

    return;
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
                        To navigate this issue, find a host in the room whom is currently premium*/
                        

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

export const setTrack = (users, trackData, currentRoom, newRoom) => {
    users.forEach(async (current, index, arr) => {
        /* We keep an array in our "store" to hold access keys that have been updated.
        They are kept within the array because when going through the "setTrack" when -
        multiple tracks have been set, we don't recheck the users, meaning the old access key -
        will be kept until queue reaches a point of no tracks being played.
        */
        if (Object.keys(globalStore.rooms[currentRoom].accessStore).includes(current.userID)) {
            current.accessToken = globalStore.rooms[currentRoom].accessStore[current.userID];
        }

        console.log(`UserID: ${current.userID}`);
        console.log(`Access Store Length: ${Object.keys(globalStore.rooms[currentRoom].accessStore).length}`);

        const options = makePlaybackQuery({deviceID: current.mainDevice, accessToken: current.accessToken, newRoom: newRoom, nextTrack: trackData.trackURI});
        const queue = globalStore.rooms[currentRoom].queue;

        console.log(`setTrack Access Token: ${current.accessToken}`);

        globalStore.rooms[currentRoom].currentTrack = {
            currentPlaying: true, 
            trackURI: trackData.trackURI, 
            startedAt: Date.now(),
            queue: queue,
            trackData: trackData,
        };

        if (options) {
            request.put(options, async (err, response, body) => {
                if (body.length) {
                    const error = JSON.parse(body)['error'];
                    // TODO: Do some error handling based off of codes
                    if (error.hasOwnProperty('status') && error.status === 401) {
                        console.log('Access token expired'); // REFACTOR: Send to client; re-auth on frontend?
                        newRoom.emit('reAuth', {
                            'user': current.userID,
                        });
                    }
                }
                newRoom.emit('addedQueue', {queueData: [...queue]});
                newRoom.emit('currentTrack', exportCurrentTrack(trackData, queue));
            });
        }
    });
}

export const setTrackTime = async (duration, users, roomRef, currentRoom, newRoom) => {
    await setTimer(duration).then(async () => {
        const queue = globalStore.rooms[currentRoom].queue;

        let paused = [];

        for (const user of users) {
            paused.push(pauseTrack(user.accessToken));
        }

        roomRef.update({
            currentTrack: null,
        });
        
        if (queue.length) {
            const queued = Promise.all(paused).then(async () => {
                // Grab first item in queue
                const song = queue.shift();
                
                roomRef.collection('roomQueue').doc('currentQueue').set({queue: queue});
                
                await roomRef.update({
                    currentTrack: song,
                }).then(() => {
                    return setTrack(users, song, currentRoom, newRoom);
                });

                // Refactor: We should keep users updated
                // Check the queue again to ensure that it's empty
                return await setTrackTime(song.trackDuration, users, roomRef, currentRoom, newRoom);
            });

            return await queued;
        } else {
            globalStore.rooms[currentRoom].currentTrack = {currentPlaying: false, trackURI: '', startedAt: '', queue: [], trackData: false};
        }
    });
};

// REFACTOR: Put in utils/ (ensure no other file is dependant on this, but on utils/)
export const makePlaybackQuery = ({
    deviceID = '',
    accessToken = '',
    newRoom,
    nextTrack
}) => {
    if (deviceID === '' || accessToken === '') {
        newRoom.emit('roomError', {
            'typeError': 'Couldn\'t find device(s)!',
            'errorMessage': 'No devices were found',
            'for': ''
        });

        // REQUEST FOR A NEW DEVICE ID .. 
        winston.error('No devices were found') // REFACTOR: Remove this
        return false;
    }

    deviceID = `?device_id=${deviceID}`;

    const options = {
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

// REFACTOR: Put in room_events/ (ensure no other file is dependant on this, but on utils/)
export const pauseTrack = (access_token) => {
    const options = {
        url: 'https://api.spotify.com/v1/me/player/pause',
        headers: {
            'Authorization': 'Bearer ' + access_token
        },
    }

    return new Promise((resolve, reject) => {
        request.put(options, function (error, resp, body) {
            if (error) {
                winston.error(error);
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

// REFACTOR: Put in room_events/
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
