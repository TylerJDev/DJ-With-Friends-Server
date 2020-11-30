const express = require('express');
const { retrieveSpotifyData } = require('../controllers/retrieveSpotifyData');
const { retrieveTrackData } = require ('../controllers/retrieveTrackData');
const { callbackFromSpotify } = require ('../controllers/callbackFromSpotify');
const { retrieveUserTrackData } = require ('../controllers/retrieveUserTrackData');
const { registerNewUser } = require ('../controllers/registerNewUser');
const { currentPlaying } = require ('../controllers/currentPlaying');

const router = express.Router();

/* Get */
router.get('/login', retrieveSpotifyData);
router.get('/playing', currentPlaying);

/* Post */
router.post('/search', retrieveTrackData);
router.post('/callback', callbackFromSpotify);
router.post('/usertracks', retrieveUserTrackData);
router.post('/register', registerNewUser);

module.exports = router;