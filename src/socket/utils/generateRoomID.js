/**
 * 
 * @param {Array} ids - A collection of current room IDs
 * @return {string} A randomized ID
 * 
 * @example
 * 
 *  randomIDGen(['1234', '5678']);
 */

export const randomIDGen = function(ids, count=1) {
    let randID = Math.floor(Math.random() * 8999) + 1000;

    if (ids.indexOf(randID) >= 0 && count < 5) {
        return randomIDGen(ids, count+=1);
    } else if (count >= 5) { return {'typeError': 'ID generation failed', 'errorMessage': 'Could not generate a room ID'}; } 

    return randID;
}   

export const randomAlphaGen = function() {
    const characters = 'abcdefghijklmnopqrstuvwxyz'
    let randID = [];

    for (let i = 0; i < 25; i++) {
        let randNum = Math.floor(Math.random() * characters.length);
        randID.push(randNum);
        randID.push(characters[randNum])
        randID.push(Math.floor(Math.random() * 10));
    }

    return randID.join('').substring(0, 15);
}