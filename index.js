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
     *              language: string,
     *              compensation, number,
     *              messages: {
     *                  success: string,
     *                  compensation: string
     *              }
     *          }}
     */
    var pluginConfig = {
        "apiKey": "",
        "units": "metric",
        "language": "fi-FI",
        "compensation": 0.44,
        "messages": {
            "success": "${nick}: distance ${origin} - ${destination} is ${distance.rows[0].elements[0].distance.text} and travel time is about ${distance.rows[0].elements[0].duration.text}.",
            "compensation": " And mileage allowance for this is ${compensation}€"
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
         * @param   {boolean}   [showCompensation]
         */
        function getDistance(origin, destination, from, showCompensation) {
            var url = 'https://maps.googleapis.com/maps/api/distancematrix/json?origins=' + origin + '&destinations=' + destination + '&language=' + pluginConfig.language + '&units=' + pluginConfig.units + '&key=' + pluginConfig.apiKey;

            // Fetch distance data from Google Distance Matrix API.
            helpers.download(url, function onData(data) {
                var distanceData = JSON.parse(data);

                if (distanceData.status !== 'OK') {
                    throw distanceData.error_message || distanceData.status;
                } else if (distanceData.rows[0].elements[0].status !== 'OK') {
                    throw distanceData.rows[0].elements[0].status;
                } else {
                    var templateVars = {
                        nick: from,
                        origin: origin,
                        destination: destination,
                        distance: distanceData
                    };

                    var message = _.template(pluginConfig.messages.success, templateVars);

                    if (showCompensation) {
                        templateVars.compensation = Math.ceil(distanceData.rows[0].elements[0].distance.value / 1000) * pluginConfig.compensation;

                        message += _.template(pluginConfig.messages.compensation, templateVars);
                    }

                    channel.say(message);
                }
            });
        }

        // Regex for this plugin
        return {
            '^!(matka|kilometrikorvaus) (.+)\\|(.+)': function command(from, matches) {
                if (_.isEmpty(pluginConfig.apiKey)) {
                    channel.say(from, 'You need to set Google Maps API key!');
                } else {
                    try {
                        var compensation = matches[1] == 'kilometrikorvaus';

                        getDistance(matches[2], matches[3], from, compensation);
                    } catch (error) {
                        channel.say(from, 'Oh noes, error: ' + error);
                    }
                }
            }
        };
    };
};