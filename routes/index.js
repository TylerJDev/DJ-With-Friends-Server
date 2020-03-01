const express = require('express');
const { retrieveSpotifyData } = require('../controllers/retrieveSpotifyData');
const { retrieveTrackData } = require ('../controllers/retrieveTrackData');
const { callbackFromSpotify } = require ('../controllers/callbackFromSpotify');
const router = express.Router();

/* Get */
router.get('/login', retrieveSpotifyData);

/* Post */
router.post('/search', retrieveTrackData);
router.post('/callback', callbackFromSpotify);

module.exports = router;