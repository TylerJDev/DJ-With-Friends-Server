import request from 'request';
import * as keys from '../keys.js'; // Replace keys with environment variables

export const callbackFromSpotify = (req, res, next) => {
    const code = req.body['auth_code'] || null;
    const refresh = req.body['refresh_token'] || null;
  
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(keys.client_id + ':' + keys.client_secret).toString('base64'))
      },
      json: true
    };
  
    if (code !== null && refresh === null) {
      authOptions.form['code'] = code;
      authOptions.form['redirect_uri'] = keys.redirect_uri;
    } else if (code === null && refresh !== null) {
      authOptions.form['refresh_token'] = refresh;
      authOptions.form.grant_type = 'refresh_token';
    }
  
    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const access_token = body.access_token, refresh_token = body.refresh_token, expires_in = body.expires_in;
  
        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };
  
        // Use access token to access the Spotify Web API
        request.get(options, function(error, response, body) { 
            try {
                let authBody = body;
                authBody.access_token = access_token;
                authBody.expires_in = expires_in;
        
                if (refresh === null) {
                    authBody.refresh_token = refresh_token;
                }
        
                const deviceOptions = { url: 'https://api.spotify.com/v1/me/player/devices', headers: { 'Authorization': 'Bearer ' + access_token }, json: true }
        
                // Grab devices from client
                request.get(deviceOptions, function(error, response, body) {
                    authBody.devices = body;
                    res.send(authBody);
                });
            } catch (err) { next(err); }
        });
      } else {
        // Send something to the client here!
        console.log('Invalid Token!', body);
      }
    });
}