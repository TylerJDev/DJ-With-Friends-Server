'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.retrieveSpotifyData = undefined;

var _generateRandomString = require('../utils/generateRandomString.js');

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _keys = require('../keys.js');

var keys = _interopRequireWildcard(_keys);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Replace keys with environment variables

var retrieveSpotifyData = exports.retrieveSpotifyData = function retrieveSpotifyData(req, res) {
    var state = (0, _generateRandomString.generateRandomString)(16);
    var scope = 'user-modify-playback-state user-read-private user-read-playback-state';
    var params = { response_type: 'code', client_id: keys.client_id, scope: scope, redirect_uri: keys.redirect_uri, state: state

        // Send client auth URL
    };res.send('https://accounts.spotify.com/authorize?' + _querystring2.default.stringify(params));
};