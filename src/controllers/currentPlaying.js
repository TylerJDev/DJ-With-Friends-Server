import trackData from '../../static/tracks.json';

export const currentPlaying = (req, res) => {
    res.send({'trackData': trackData});
}