/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

PWA.include({
    _routes: {
        // Client -> Odoo
        out: {
            '/web/webclient/version_info': '_routeOutVersionInfo',
            '/longpolling/poll': '_routeOutLongPolling',
            '/web/dataset/call_kw': '_routeOutDatasetCallKW',
            '/web/action/load': '_routeOutActionLoad',
            '/web/dataset/search_read': '_routeOutDatasetSearchRead',
        },
        // Client <- Odoo
        in: {
            '/web/dataset/call_kw': '_routeInDatasetCallKW',
            '/web/dataset/search_read': '_routeInDatasetSearchRead',
            '/web/action/load': '_routeInActionLoad',
        }
    },


    /*
     * OUT ROUTES
     */

    /**
     * Odoo uses this endpoint when try to check the network, so
     * we reply that all is working (only need a 200 reply).
     *
     * @returns {Promise[Response]}
     */
    _routeOutVersionInfo: function() {
        return new Promise(resolve => resolve(ResponseJSONRPC({})));
    },

    /**
     * Handle model method calls requests
     *
     * @param {String} url
     * @param {Object} data
     * @returns {Promise[Response]}
     */
    _routeOutDatasetCallKW: function(url, request_data) {
        return new Promise(async (resolve, reject) => {
            const pathname_parts = url.pathname.split('/');
            const model = pathname_parts[4];
            const method_name = pathname_parts[5];
            if (Exporter.prototype.hasOwnProperty(method_name)) {
                const resp_data = await this._exporter[method_name](model, request_data.params);
                resolve(ResponseJSONRPC(resp_data));
            }
            reject();
        });
    },

    /**
     * Reply to Odoo that doesn't exists new longpolling notifications
     *
     * @returns {Promise[Response]}
     */
    _routeOutLongPolling: function() {
        return new Promise(resolve => resolve(ResponseJSONRPC([])));
    },

    /**
     * Odoo uses this endpoint to get the action definition.
     * We reply with a cached one
     *
     * @param {String} url
     * @param {Object} data
     * @return {Promise[Response]}
     */
    _routeOutActionLoad: function(url, request_data) {
        return new Promise(async resolve => {
            const resp_data = await this._exporter.action_load(request_data.params);
            resolve(ResponseJSONRPC(resp_data));
        });
    },

    /**
     * @returns {Promise[Response]}
     */
    _routeOutDatasetSearchRead: function(url, request_data) {
        return new Promise(async resolve => {
            const resp_data = await this._exporter.search_read(false, request_data.params);
            resolve(ResponseJSONRPC(resp_data));
        });
    },


    /*
     * IN ROUTES
     */

    /**
     * Cache model method call replies.
     *
     * @param {String} url
     * @param {Object} response_data
     * @returns {Promise}
     */
    _routeInDatasetCallKW: function(url, response_data) {
        return new Promise(async resolve => {
            const pathname_parts = url.pathname.split('/');
            const model = pathname_parts[4];
            const method_name = pathname_parts[5];
            if (Importer.prototype.hasOwnProperty(method_name)) {
                this._importer[method_name](model, response_data.result);
            }
            resolve();
        });
    },

    /**
     * Cache search_read calls
     *
     * @param {String} url
     * @param {Object} response_data
     * @returns {Promise}
     */
    _routeInDatasetSearchRead: function(url, response_data, request_data) {
        return new Promise(async resolve => {
            const model = request_data.params.model;
            this._importer.search_read(model, response_data.result, JSON.stringify(request_data.params.domain));
            resolve();
        });
    },

    /**
     * Cache action_load calls
     *
     * @param {String} url
     * @param {Object} response_data
     * @returns {Promise}
     */
    _routeInActionLoad: function(url, response_data) {
        return new Promise(async resolve => {
            this._importer.action_load(response_data.result);
            resolve();
        });
    },
});
