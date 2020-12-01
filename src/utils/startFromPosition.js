import request from 'request'
import winston from '../../config/winston'
/**
 * This function allows the spotify player to start from set position.
 * It will be used to start the track from the set position if user has to re-auth, or a new user joins.
 * @param {string} accessToken 
 * @param {string} deviceID 
 * @param {number} position 
 * @param {string} trackURI 
 */

export const startFromPosition = (accessToken, deviceID, position, trackURI)  => {
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