/**
 * Plugin dependencies.
 *
 * @type {exports}
 */
var _ = require('lodash');
var helpers = require('unibot-helpers');

/**
 * Matka plugin for UniBot.
 *
 * @param   {Object} options Plugin options object, description below.
 *      db: {mongoose} the mongodb connection
 *      bot: {irc} the irc bot
 *      web: {connect} a connect + connect-rest webserver
 *      config: {Object} UniBot configuration
 *
 * @return  {Function}  Init function to access shared resources
 */
module.exports = function init(options) {
    var config = options.config;

    /**
     * Default plugin configuration. These can be override on your UniBot config.js file
     *
     * @type    {{
     *              apiKey: string,
     *              units: string,
     *              language: string
     *          }}
     */
    var pluginConfig = {
        "apiKey": "",
        "units": "metric",
        "language": "fi-FI"
    };

    // Merge configuration for plugin
    if (_.isObject(config.plugins) && _.isObject(config.plugins.matka)) {
        pluginConfig = _.merge(pluginConfig, config.plugins.matka);
    }

    return function plugin(channel) {
        /**
         * Todo add description.
         *
         * @param   {string}    origin
         * @param   {string}    destination
         * @param   {string}    from
         */
        function getDistance(origin, destination, from) {
            var url = 'https://maps.googleapis.com/maps/api/distancematrix/json?origins=' + origin + 'destinations=' + destination + '&language=' + pluginConfig.language + '&units=' + pluginConfig.units + '&key=' + pluginConfig.apiKey;

            helpers.download(url, function(data) {
                try {
                    var distanceData = JSON.parse(data);

                    var templateVars = {
                        nick: from,
                        origin: origin,
                        destination: destination,
                        distance: distanceData
                    };

                    var message = "${nick}: matka ${origin} - ${destination} on ${distance.rows[0].elements[0].distance.text}";

                    channel.say(_.template(message, templateVars))
                } catch (error) {
                    channel.say('Oh noes, error: ' + error, from);
                }
            });
        }

        return {
            '!matka (.+)\\|(.+)': function command(from, matches) {
                if (_.empty(pluginConfig.apiKey)) {
                    channel.say("You need to set Google Maps API key!", from);
                } else {
                    getDistance(matches[1], matches[2], from);
                }
            }
        };
    };
};