import {validateAlbumImage} from '../utils/validateAlbumImage';

/**
 * Exports current track via an object
 * @param {object} trackData - Object that contains the data of the current track.
 * @param {array} queue - Array that contains the current queue
 */

export const exportCurrentTrack = (trackData, queue) => {
    const currentTrack = {
        track: trackData.trackTitle,
        currentPlaying: true,
        artist: trackData.artist,
        album: trackData.albumTitle,
        albumImage: validateAlbumImage(trackData.albumImage), // Refactor: ensure trackdata has albumimages first
        duration: trackData.trackDuration,
        timeStarted: Date.now(),
        queue: queue, //Refactor: globalStore.rooms[currentRoom].queue,
        history: [], //Refactor: globalStore.rooms[currentRoom].history,
        trackURI: trackData.trackURI,
    };

    return currentTrack;
}