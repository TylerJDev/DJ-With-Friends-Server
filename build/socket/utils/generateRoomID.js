'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/**
 * 
 * @param {Array} ids - A collection of current room IDs
 * @return {string} A randomized ID
 * 
 * @example
 * 
 *  randomIDGen(['1234', '5678']);
 */

var randomIDGen = exports.randomIDGen = function randomIDGen(ids) {
    var count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

    var randID = Math.floor(Math.random() * 8999) + 1000;

    if (ids.indexOf(randID) >= 0 && count < 5) {
        return randomIDGen(ids, count += 1);
    } else if (count >= 5) {
        return { 'typeError': 'ID generation failed', 'errorMessage': 'Could not generate a room ID' };
    }

    return randID;
};