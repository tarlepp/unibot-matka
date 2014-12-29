/**
 * Plugin dependencies.
 *
 * @type {exports}
 */
var _ = require('lodash');
var helpers = require('unibot-helpers');

/**
 * Matka plugin for UniBot. This plugin uses Google Distance Matrix API to get actual data.
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
     * Default plugin configuration. These can be override on your UniBot config.js file. Please note that you need to
     * specify 'apiKey' value to your config.js file.
     *
     * @type    {{
     *              apiKey: string,
     *              units: string,
     *              language: string
     *              messages: {
     *                  success: string
     *              }
     *          }}
     */
    var pluginConfig = {
        "apiKey": "",
        "units": "metric",
        "language": "fi-FI",
        "messages": {
            "success": "${nick}: distance ${origin} - ${destination} is ${distance.rows[0].elements[0].distance.text} and travel time is about ${distance.rows[0].elements[0].duration.text}"
        }
    };

    // Merge configuration for plugin
    if (_.isObject(config.plugins) && _.isObject(config.plugins.matka)) {
        pluginConfig = _.merge(pluginConfig, config.plugins.matka);
    }

    // Actual plugin implementation
    return function plugin(channel) {
        /**
         * Helper function to get distance data for specified locations.
         *
         * @param   {string}    origin
         * @param   {string}    destination
         * @param   {string}    from
         */
        function getDistance(origin, destination, from) {
            var url = 'https://maps.googleapis.com/maps/api/distancematrix/json?origins=' + origin + '&destinations=' + destination + '&language=' + pluginConfig.language + '&units=' + pluginConfig.units + '&key=' + pluginConfig.apiKey;

            // Fetch distance data from Google Distance Matrix API.
            helpers.downloadSsl(url, function downloadSsl(data) {
                var distanceData = JSON.parse(data);

                if (distanceData.status !== 'OK' && distanceData.rows[0].elements[0].status !== 'OK') {
                    if (distanceData.status !== 'OK') {
                        throw distanceData.error_message || distanceData.status;
                    } else {
                        throw distanceData.rows[0].elements[0].status;
                    }
                } else {
                    var templateVars = {
                        nick: from,
                        origin: origin,
                        destination: destination,
                        distance: distanceData
                    };

                    channel.say(_.template(pluginConfig.messages.success, templateVars))
                }
            });
        }

        // Regex for this plugin
        return {
            '!matka (.+)\\|(.+)': function command(from, matches) {
                if (_.isEmpty(pluginConfig.apiKey)) {
                    channel.say("You need to set Google Maps API key!", from);
                } else {
                    try {
                        getDistance(matches[1], matches[2], from);
                    } catch (error) {
                        channel.say('Oh noes, error: ' + error, from);
                    }
                }
            }
        };
    };
};