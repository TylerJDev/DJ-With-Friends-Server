/**
 * Validates album images, to ensure that it's coming from the correct source.
 * @param {array} src - Array that contains the image source(s).
 */

export const validateAlbumImage = (src) => {
    // Array is expected from passed value {src}
    if (!src.length) {
        return '';
    }

    let newSrc = src.filter((current) => {
        if (current.url.indexOf('https://i.scdn.co/image/') === 0 && current.url.replace('https://i.scdn.co/image/', '').length === 40) {
            return current;
        } 
        return false;
    });

    return newSrc;
}