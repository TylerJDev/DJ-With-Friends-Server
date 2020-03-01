'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var changeSetting = exports.changeSetting = function changeSetting(currentUser, data) {
    switch (data.type) {
        case 'devices':
            currentUser.active.mainDevice = data.mainDevice;
            break;
    }
};