import { generateRandomString } from '../utils/generateRandomString.js';
import querystring from 'querystring';
import * as keys from '../keys.js'; // Replace keys with environment variables

export const retrieveSpotifyData = (req, res) => {
    const state = generateRandomString(16);
    const scope = 'user-modify-playback-state user-read-private user-read-playback-state user-top-read';
    const params = {response_type: 'code', client_id: keys.client_id, scope: scope, redirect_uri: keys.redirect_uri, state: state}

    // Send client auth URL
    res.send('https://accounts.spotify.com/authorize?' + querystring.stringify( params ));
}