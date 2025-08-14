// api/index.js
const serverless = require('serverless-http');
const app = require('../server');
const db = require('../modules/restaurant_data'); // or ../modules/restaurantDB

let cachedHandler = null; // cache the serverless handler across warm invocations
let dbReadyPromise = null; // cache the DB init promise

async function ensureReady() {
    // Initialize Mongo only once
    if (!dbReadyPromise) {
        dbReadyPromise = db.initialize(process.env.MONGODB_URI)
            .then(ok => {
                if (!ok) throw new Error('MongoDB init returned false');
                console.log('Mongo connected (serverless)');
                return true;
            })
            .catch(err => {
                console.error('Mongo init error:', err);
                throw err;
            });
    }
    await dbReadyPromise;

    // Create the serverless handler once
    if (!cachedHandler) {
        cachedHandler = serverless(app);
    }
    return cachedHandler;
}

module.exports = async(req, res) => {
    try {
        const handler = await ensureReady();
        return handler(req, res);
    } catch (e) {
        res.statusCode = 500;
        res.end(`Startup error: ${e.message}`);
    }
};