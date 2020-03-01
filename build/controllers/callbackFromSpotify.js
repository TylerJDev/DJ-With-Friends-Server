'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.callbackFromSpotify = undefined;

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _keys = require('../keys.js');

var keys = _interopRequireWildcard(_keys);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Replace keys with environment variables

var callbackFromSpotify = exports.callbackFromSpotify = function callbackFromSpotify(req, res, next) {
  var code = req.body['auth_code'] || null;
  var refresh = req.body['refresh_token'] || null;

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + new Buffer(keys.client_id + ':' + keys.client_secret).toString('base64')
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

  _request2.default.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token,
          refresh_token = body.refresh_token,
          expires_in = body.expires_in;

      var options = {
        url: 'https://api.spotify.com/v1/me',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };

      // Use access token to access the Spotify Web API
      _request2.default.get(options, function (error, response, body) {
        try {
          var authBody = body;
          authBody.access_token = access_token;
          authBody.expires_in = expires_in;

          if (refresh === null) {
            authBody.refresh_token = refresh_token;
          }

          var deviceOptions = { url: 'https://api.spotify.com/v1/me/player/devices', headers: { 'Authorization': 'Bearer ' + access_token }, json: true

            // Grab devices from client
          };_request2.default.get(deviceOptions, function (error, response, body) {
            authBody.devices = body;
            res.send(authBody);
          });
        } catch (err) {
          next(err);
        }
      });
    } else {
      // Send something to the client here!
      console.log('Invalid Token!', body);
    }
  });
};