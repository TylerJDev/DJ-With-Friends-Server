import request from 'request'; 

export const retrieveTrackData = (req, res, next) => {
    let query = req.query.search_query.split(' ').join('+');
    let access_token = req.body.access_token; /* req.body only contains user access_token */

    const options = { url: `https://api.spotify.com/v1/search?q=${query}&type=track&market=US&limit=50`, headers: { 'Authorization': 'Bearer ' + access_token } };

    request.get(options, function(error, resp, body) {
        try {
            res.send(body);
        } catch (err) { next(err); }
    });
};