'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.refreshAccessToken = undefined;

var _index = require('../store/index.js');

var refreshAccessToken = exports.refreshAccessToken = function refreshAccessToken(data) {
    // Find the "old" access token's carrier
    var allUsers = _index.globalStore.rooms.map(function (curr) {
        return curr.users;
    });

    allUsers.forEach(function (currentUser, index) {
        console.log('AccessToken: ' + currentUser[0].accessToken + ', index: ' + index + ', name: ' + currentUser[0].name);
        if (data.oldAccessToken === currentUser[0].accessToken && data.id === currentUser[0].id) {
            currentUser[0].accessToken = data.newAccessToken;
        }
    });
};