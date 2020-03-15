import request from 'request'
import { globalStore } from '../store/index.js';
import { clearSkipQueue } from './skipQueue.js';

export const addQueue = (data, newRoom, currentUser) => {
    let currentRoom = globalStore.rooms.findIndex(curr => curr.name === currentUser.active.roomID);
    
    // If queue empty, play track
    if (globalStore.rooms[currentRoom].queue.length === 0) {
        playTrack(data, currentUser, globalStore.rooms[currentRoom].host, newRoom);
    }
    
    // Add track to queue
    globalStore.rooms[currentRoom].queue.push(data);

    // Emit to entire room 
    newRoom.emit('addedQueue', globalStore.rooms[currentRoom].queue);
};

// Utilize Spotify API to handle "play" state
export const playTrack = (data, currentUser, roomHost, newRoom, skipped=false) => {
    let currentRoom;

    if (currentUser === undefined || currentUser.active === undefined) {
        return false;
    }

    try {
        currentRoom = globalStore.rooms.findIndex(curr => curr.name === currentUser.active.roomID);
    } catch(TypeError) {
        return;
    }   

    const usersCurrent_host = globalStore.rooms[currentRoom].users.filter(curr => curr.id === roomHost)[0];
    
    if (usersCurrent_host === undefined) {
        newRoom.emit('roomError', {
            'typeError': 'Couldn\'t find host user\'s access token!'
        });

        return false;
    }

    const userCurrent = {
        access_token: globalStore.rooms[currentRoom] !== undefined ? usersCurrent_host.accessToken : '',
        user: globalStore.rooms[currentRoom] !== undefined ? usersCurrent_host : '',
    }

    if (globalStore.rooms[currentRoom] === undefined) {
        console.log('An error has occurred! {ERR 15}');
        return false;
    }

    const emptyQueue = {'track': '', 'currentPlaying': false, 'artist': '', 'album': '', 'duration': '', 'timeStarted': 0, 'history': globalStore.rooms[currentRoom].history};

    let validQueue = globalStore.rooms[currentRoom].queue.length > 0;
    // Grab the next track in the queue
    let nextTrack = validQueue ? globalStore.rooms[currentRoom].queue[0].trackURI : false; 
    let nextTrackName = validQueue ? globalStore.rooms[currentRoom].queue[0].trackName : '';
    let nextTrackArtist = validQueue ? globalStore.rooms[currentRoom].queue[0].trackArtist : '';
    let nextTrackAlbum = validQueue ? globalStore.rooms[currentRoom].queue[0].trackAlbum : '';
    let nextTrackAlbumImage = validQueue ? (globalStore.rooms[currentRoom].queue[0].trackAlbumImage !== undefined && globalStore.rooms[currentRoom].queue[0].trackAlbumImage) ? globalStore.rooms[currentRoom].queue[0].trackAlbumImage : '' : ''; 
    let options = {};

    if (skipped === true) {
        globalStore.rooms[currentRoom].timeCounts.forEach((current) => { clearTimeout(current) });
        globalStore.rooms[currentRoom].currentTrack = emptyQueue;
        newRoom.emit('currentTrack', globalStore.rooms[currentRoom].currentTrack);
        newRoom.emit('addedQueue', globalStore.rooms[currentRoom].queue);
    }

    if (nextTrack === false) {
        // Grab track from data passed
        if (data === undefined) {
            globalStore.rooms[currentRoom].trackHosts.forEach((current) => { pauseTrack(current.accessToken); });
            globalStore.rooms[currentRoom].pauseList.forEach((current) => { pauseTrack(current.accessToken); });

            newRoom.emit('currentTrack', emptyQueue);
            newRoom.emit('addedQueue', globalStore.rooms[currentRoom].queue);
            return false; 
        }
        nextTrack = data.trackURI;
        nextTrackName = data.trackName;
        nextTrackArtist = data.trackArtist;
        nextTrackAlbum = data.trackAlbum;
        nextTrackAlbumImage = data.trackAlbumImage;
    }
    
    const makePlaybackQuery = ({deviceID = '', accessToken = ''}) => {
        if (deviceID === '' || accessToken === '') {
            newRoom.emit('roomError', {
                'typeError': 'Couldn\'t find device(s)!', 'errorMessage': 'No devices were found'
            });

            // REQUEST FOR A NEW DEVICE ID .. 
            return false;
        }

        deviceID = `?device_id=${deviceID}`;

        options = {
            url: `https://api.spotify.com/v1/me/player/play${deviceID}`,
            headers: { 'Authorization': 'Bearer ' + accessToken },
            body: JSON.stringify({
                "uris": [nextTrack],
            })
        }

        return options;
    }

    globalStore.rooms[currentRoom].trackHosts.forEach((current) => {
        const options = makePlaybackQuery(current);
        request.put(options, function(error, response, body) {
            if (body !== undefined && body.length) {
                let errorOf = JSON.parse(body)['error'];
                if (errorOf.hasOwnProperty('status')) {                    
                    if (!Array.from(globalStore.rooms[currentRoom].trackHosts).filter(currentUser => currentUser.user.premium === 'true').length) {
                        clearFromQueue(currentRoom, nextTrack, newRoom);
                        return false;
                    }
                }
            }
            
            if (current.user.host) {
                // If there is no error playing the track
                let trackTimeout = setTimeout(() => { checkTrack() }, data.trackDuration - 10000);
                globalStore.rooms[currentRoom].timeCounts.push(trackTimeout);

                // Emit current track to room
                globalStore.rooms[currentRoom].currentTrack = {'track': nextTrackName, 'currentPlaying': true, 'artist': nextTrackArtist, 'album': nextTrackAlbum, 'albumImage': nextTrackAlbumImage, 'duration': data.trackDuration, 'timeStarted': Date.now(), 'queue': globalStore.rooms[currentRoom].queue, 'history': globalStore.rooms[currentRoom].history};
                newRoom.emit('addedQueue', globalStore.rooms[currentRoom].queue);
                newRoom.emit('currentTrack', globalStore.rooms[currentRoom].currentTrack);

                const checkTrack = () => {
                    let currentAccess_token = userCurrent.access_token;
                    /* If the host isn't premium, the API call above will result in an error
                       To navigate this issue, find a host in the room whom is currently premium
                    */

                   if (currentUser.active.premium !== true) {
                        const premium_hosts = Array.from(globalStore.rooms[currentRoom].trackHosts).filter(currentUser => currentUser.user.premium === 'true');

                        if (!premium_hosts.length) {
                            setTimeout(() => { 
                                clearFromQueue(currentRoom, nextTrack, newRoom);
                            }, 10000);

                            // Emit need for premium user
                            socket.emit('roomError', {
                                'typeError': 'No eligible hosts!', 'errorMessage': 'Premium host is needed to play from the queue!'
                            });
                        } else {
                            currentAccess_token = premium_hosts[0].accessToken;
                        }
                   }

                    // Check the current playback state 
                    const playbackOptions = {
                        url: 'https://api.spotify.com/v1/me/player',
                        headers: { 'Authorization': 'Bearer ' + currentAccess_token },
                    }
                    
                    request.get(playbackOptions, function(error, response, body) {
                        const trackDetails = JSON.parse(body);
                        // Check time versus data.trackDuration
                        console.log(`Current duration: ${trackDetails.progress_ms}, Track duration: ${data.trackDuration}`);
                        
                        // Update client time progress
                        newRoom.emit('timeUpdate', {'seconds': Math.floor(trackDetails.progress_ms / 1000)});
                        clearSkipQueue(globalStore, currentRoom, newRoom);
                            const timeLeft = (data.trackDuration - trackDetails.progress_ms);
                            setTimeout(function() {
                                // Remove track from queue
                                clearFromQueue(currentRoom, nextTrack, newRoom);
                                playTrack(globalStore.rooms[currentRoom].queue[0], currentUser, roomHost, newRoom);
                            }, timeLeft);
                    });
                }
            }
        });
    });
}

export const pauseTrack = (access_token) => {
    const options = {
        url: 'https://api.spotify.com/v1/me/player/pause',
        headers: { 'Authorization': 'Bearer ' + access_token },
    }

    request.put(options, function(error, resp, body) {
        console.log(error);
        console.log(body);
    });
}

export const clearFromQueue = (currentRoom, nextTrack, newRoom) => {
    const trackIndex = globalStore.rooms[currentRoom].queue.findIndex(curr => curr.trackURI === nextTrack);
    newRoom.emit('removeFromQueue', globalStore.rooms[currentRoom].queue[trackIndex]);

    const removedTrack = globalStore.rooms[currentRoom].queue.splice(trackIndex, 1);
    globalStore.rooms[currentRoom].history.push(removedTrack);

    // Clear any users on "pausedList"
    globalStore.rooms[currentRoom].pauseList.forEach((current) => { pauseTrack(current.accessToken); });
}