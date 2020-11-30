import request from 'request';
import * as keys from '../keys.js';

export const retrieveUserTrackData = (req, res, next) => {
  let access_token = req.body.access_token; /* req.body only contains user access_token */
  const options = { url: `https://api.spotify.com/v1/me/top/tracks?time_range=medium_term`, headers: { 'Authorization': 'Bearer ' + access_token } };

  request.get(options, function(error, resp, body) {
      try {
        res.send(body);
      } catch (err) { next(err); }
  });
};