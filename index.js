module.exports = function(config) {
    // Config object passed in.
    if (process.env.GULP_CONFIG_PATH) {
        global.MKT_CONFIG = require(process.env.GULP_CONFIG_PATH);
    } else {
        global.MKT_CONFIG = config || require('../../config');
    }

    return require('./tasks');
};
