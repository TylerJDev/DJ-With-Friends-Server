'use strict';

var express = require('express');

var _require = require('../controllers/retrieveSpotifyData'),
    retrieveSpotifyData = _require.retrieveSpotifyData;

var _require2 = require('../controllers/retrieveTrackData'),
    retrieveTrackData = _require2.retrieveTrackData;

var _require3 = require('../controllers/callbackFromSpotify'),
    callbackFromSpotify = _require3.callbackFromSpotify;

var router = express.Router();

/* Get */
router.get('/login', retrieveSpotifyData);

/* Post */
router.post('/search', retrieveTrackData);
router.post('/callback', callbackFromSpotify);

module.exports = router;