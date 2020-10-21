/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

PWA.include({
    _routes: {
        // Client -> Odoo
        out: {
            "/web/webclient/version_info": "_routeOutVersionInfo",
            "/longpolling/poll": "_routeOutLongPolling",
            "/web/dataset/call_kw": "_routeOutDatasetCallKW",
            "/web/dataset/call": "_routeOutDatasetCall",
            "/web/action/load": "_routeOutActionLoad",
            "/web/dataset/search_read": "_routeOutDatasetSearchRead",
            "/web/webclient/translations": "_routeOutTranslations",
        },
        // Client <- Odoo
        in: {
            "/web/dataset/call_kw": "_routeInDatasetCallKW",
            "/web/dataset/search_read": "_routeInDatasetSearchRead",
            "/web/action/load": "_routeInActionLoad",
            "/web/webclient/translations": "_routeInTranslations",
        },
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
    _routeOutVersionInfo: function () {
        return Promise.resolve(ResponseJSONRPC({}));
    },

    /**
     * Handle model method calls requests
     *
     * @param {String} url
     * @param {Object} data
     * @returns {Promise[Response]}
     */
    _routeOutDatasetCallKW: function (url, request_data) {
        return new Promise(async (resolve, reject) => {
            const pathname_parts = url.pathname.split("/");
            const model = pathname_parts[4];
            const method_name = pathname_parts[5];
            if (Exporter.prototype.hasOwnProperty(method_name)) {
                const resp_data = await this._exporter[method_name](
                    model,
                    request_data.params
                );
                this._updateSyncCount();
                if (resp_data) {
                    return resolve(ResponseJSONRPC(resp_data));
                }
            }
            return reject();
        });
    },

    /**
     * Handle model method calls requests
     *
     * @param {String} url
     * @param {Object} data
     * @returns {Promise[Response]}
     */
    _routeOutDatasetCall: function (url, request_data) {
        return new Promise(async (resolve, reject) => {
            const pathname_parts = url.pathname.split("/");
            const model = pathname_parts[4];
            const method_name = pathname_parts[5];
            if (Exporter.prototype.hasOwnProperty(method_name)) {
                const resp_data = await this._exporter[method_name](
                    model,
                    request_data.params
                );
                this._updateSyncCount();
                if (resp_data) {
                    return resolve(ResponseJSONRPC(resp_data));
                }
            }
            return reject();
        });
    },

    /**
     * Reply to Odoo that doesn't exists new longpolling notifications.
     * Wait for the reply is important to be nice with the cpu :)
     *
     * @returns {Promise[Response]}
     */
    _routeOutLongPolling: function () {
        return new Promise((resolve) => {
            setTimeout(() => resolve(ResponseJSONRPC([])), 30000);
        });
    },

    /**
     * Odoo uses this endpoint to get the action definition.
     * We reply with a cached one
     *
     * @param {String} url
     * @param {Object} data
     * @return {Promise[Response]}
     */
    _routeOutActionLoad: function (url, request_data) {
        return new Promise(async (resolve, reject) => {
            const resp_data = await this._exporter.action_load(request_data.params);
            if (resp_data) {
                return resolve(ResponseJSONRPC(resp_data));
            }
            return reject();
        });
    },

    /**
     * @param {String} url
     * @param {Object} request_data
     * @returns {Promise[Response]}
     */
    _routeOutDatasetSearchRead: function (url, request_data) {
        return new Promise(async (resolve, reject) => {
            const resp_data = await this._exporter.search_read(
                false,
                request_data.params
            );
            if (resp_data) {
                return resolve(ResponseJSONRPC(resp_data));
            }
            return reject();
        });
    },

    /**
     * @returns {Promise[Response]}
     */
    _routeOutTranslations: function () {
        return new Promise(async (resolve, reject) => {
            const resp_data = await this._exporter.translations();
            if (resp_data) {
                return resolve(ResponseJSONRPC(resp_data.value));
            }
            return reject();
        });
    },

    /**
     * Cache Generic Post Requests
     *
     * @param {String} url
     * @param {Object} request_data
     * @returns {Promise[Response]}
     */
    _routeOutGenericPost: function (url, request_data) {
        return new Promise(async (resolve, reject) => {
            console.log("---------- GENERIC POST OUT");
            const post_cache = await this._exporter.post_generic(
                url.pathname,
                request_data.params
            );
            if (post_cache) {
                return resolve(ResponseJSONRPC(post_cache.result));
            }
            return reject();
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
    _routeInDatasetCallKW: function (url, response_data, request_data) {
        const pathname_parts = url.pathname.split("/");
        const model = pathname_parts[4];
        const method_name = pathname_parts[5];
        if (Importer.prototype.hasOwnProperty(method_name)) {
            this._importer[method_name](model, response_data.result, request_data.params);
        }
        return Promise.resolve();
    },

    /**
     * Cache search_read calls
     *
     * @param {String} url
     * @param {Object} response_data
     * @returns {Promise}
     */
    _routeInDatasetSearchRead: function (url, response_data, request_data) {
        const model = request_data.params.model;
        this._importer.search_read(
            model,
            response_data.result,
            JSON.stringify(request_data.params.domain)
        );
        return Promise.resolve();
    },

    /**
     * Cache action_load calls
     *
     * @param {String} url
     * @param {Object} response_data
     * @returns {Promise}
     */
    _routeInActionLoad: function (url, response_data) {
        this._importer.action_load(response_data.result);
        return Promise.resolve();
    },

    _routeInTranslations: function (url, response_data) {
        this._importer.translations(response_data.result);
        return Promise.resolve();
    },

    /**
     * Cache Generic Post Requests
     */
    _routeInGenericPost: function (url, response_data, request_data) {
        console.log("---------- GENERIC POST IN");
        this._importer.post_generic(
            url.pathname,
            request_data.params,
            response_data.result
        );
        return Promise.resolve();
    },
});
