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
        console.log('An error has occurred! Couldn\'t skip track! {ERR 12}');
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

    let userDevices = [];
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
            pauseTrack(userCurrent.access_token);
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
    

    //# DEV-NOTE: The user could be allowed to see which device to pick from if there are multiple devices
    //# This could be done via a modal popup using sockets to emit this data to the user
    try {
        userDevices = userCurrent.user.devices.devices.filter(curr => curr['is_restricted'] === false);
        let deviceID = currentUser.active.mainDevice === null ? userDevices.length ? `?device_id=${userDevices[0].id}` : '' : `?device_id=${currentUser.active.mainDevice}`;

        options = {
            url: `https://api.spotify.com/v1/me/player/play${deviceID}`,
            headers: { 'Authorization': 'Bearer ' + userCurrent.access_token },
            body: JSON.stringify({
            "uris": [nextTrack],
            })
        }
    } catch (TypeError) {
        newRoom.emit('roomError', {
            'typeError': 'Couldn\'t find device(s)!', 'errorMessage': 'No devices were found'
        });

        return false;
    }

    request.put(options, function(error, response, body) {
      let errorFound = '';

      try {
        let errorOf = JSON.parse(body)['error'];
        if (errorOf.hasOwnProperty('status')) {
            console.log('An error has occurred! Couldn\'t skip track! {ERR 13}');
            console.log(userCurrent.access_token);
            newRoom.emit('roomError', {
                'typeError': errorOf.status, 'errorMessage': errorOf.message
            });

            errorFound = true;
            clearFromQueue(currentRoom, nextTrack, newRoom);
            return false;
        }
        
        return true;
      } catch(SyntaxError) {
        errorFound = false;
      }
    
      // If there is no error with playing the track
      if (!errorFound) {
          let trackTimeout = setTimeout(() => { checkTrack() }, data.trackDuration - 10000);
          globalStore.rooms[currentRoom].timeCounts.push(trackTimeout);

          // Emit current queue to room
          

          // Emit current track to room
          globalStore.rooms[currentRoom].currentTrack = {'track': nextTrackName, 'currentPlaying': true, 'artist': nextTrackArtist, 'album': nextTrackAlbum, 'albumImage': nextTrackAlbumImage, 'duration': data.trackDuration, 'timeStarted': Date.now(), 'queue': globalStore.rooms[currentRoom].queue, 'history': globalStore.rooms[currentRoom].history};
          newRoom.emit('addedQueue', globalStore.rooms[currentRoom].queue);
          newRoom.emit('currentTrack', globalStore.rooms[currentRoom].currentTrack);
          
          const checkTrack = () => {

            // Check the current playback state 
            const playbackOptions = {
                url: 'https://api.spotify.com/v1/me/player',
                headers: { 'Authorization': 'Bearer ' + userCurrent.access_token },
            }

            request.get(playbackOptions, function(error, response, body) {
                const trackDetails = JSON.parse(body);
                
                // If track is playing, pause for room

                // Check time versus data.trackDuration
                console.log(`Current duration: ${trackDetails.progress_ms}, Track duration: ${data.trackDuration}`);
                
                // Update client time progress
                newRoom.emit('timeUpdate', {'seconds': Math.floor(trackDetails.progress_ms / 1000)});
                clearSkipQueue(globalStore, currentRoom, newRoom);

                // if (trackDetails.progress_ms >= data.trackDuration - 10000) {
                    const timeLeft = (data.trackDuration - trackDetails.progress_ms);
                    setTimeout(function() {
                        // Remove track from queue
                        clearFromQueue(currentRoom, nextTrack, newRoom);
                        // const trackIndex = globalStore.rooms[currentRoom].queue.findIndex(curr => curr.trackURI === nextTrack);
                        // newRoom.emit('removeFromQueue', globalStore.rooms[currentRoom].queue[trackIndex]);

                        // const removedTrack = globalStore.rooms[currentRoom].queue.splice(trackIndex, 1);
                        // globalStore.rooms[currentRoom].history.push(removedTrack);

                        playTrack(globalStore.rooms[currentRoom].queue[0], currentUser, roomHost, newRoom);
                    }, timeLeft);
                // }

            });
          }
      }
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
}