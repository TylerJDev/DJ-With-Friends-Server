'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.retrieveTrackData = undefined;

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var retrieveTrackData = exports.retrieveTrackData = function retrieveTrackData(req, res, next) {
    var query = req.query.search_query.split(' ').join('+');
    var access_token = req.body.access_token; /* req.body only contains user access_token */

    var options = { url: 'https://api.spotify.com/v1/search?q=' + query + '&type=track&market=US&limit=50', headers: { 'Authorization': 'Bearer ' + access_token } };

    _request2.default.get(options, function (error, resp, body) {
        try {
            res.send(body);
        } catch (err) {
            next(err);
        }
    });
};