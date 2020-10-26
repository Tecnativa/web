/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

/**
 * This class is used to store Odoo replies
 * The name of the functions match with the name of the python implementation.
 */
const Importer = DatabaseComponent.extend({
    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise}
     */
    name_search: function (model, data) {
        const records = _.map(data, (record) => {
            return {id: record[0], display_name: record[1]};
        });
        return this._mergeModelRecord(model, records);
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise}
     */
    name_get: function (model, data) {
        return this.name_search(model, data);
    },

    onchange: function (model, data, request_params) {
        const field = params.args[2];
        // FIXME: Can't process multiple fields
        if (typeof field !== "string") {
            return Promise.resolve();
        }
        return this._db.saveRecord("webclient", "onchange", {
            model: model,
            field: field,
            params: JSON.stringify(request_params.args[1][field]),
            changes: data,
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise}
     */
    load_views: function (model, data) {
        const vtype = Object.keys(data.fields_views)[0];
        return this._db.saveRecord(
            "webclient",
            "views",
            _.extend({model: data.fields_views[vtype].model}, data)
        );
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise}
     */
    default_get: function (model, data) {
        return this._db.getRecord("webclient", "defaults", model).then((record) => {
            const nrecord = _.defaults(record || {}, {
                model: model,
                defaults: {},
            });
            _.extend(nrecord.defaults, data);
            this._db.saveRecord("webclient", "defaults", nrecord);
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise}
     */
    load_menus: function (model, data) {
        return this._db.saveRecord("webclient", "userdata", {
            param: "menus",
            value: data,
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise}
     */
    read: function (model, data) {
        return this._mergeModelRecord(model, data);
    },

    read_template: function (model, data, request_params) {
        return this.db.saveRecord("webclient", "template", {
            xml_ref: request_params.args[0],
            template: data,
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @param {Object} request_params
     * @returns {Promise}
     */
    get_filters: function (model, data, request_params) {
        return this._db.saveRecord("webclient", "filters", {
            model: request_params.args[0],
            filters: data,
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @param {String} domain
     */
    search_read: function (model, data, domain) {
        if (!data) {
            return;
        }
        if ("records" in data) {
            return this._mergeModelRecord(model, data.records, "[]");
        }
        return this._mergeModelRecord(model, data, "[]");
    },

    /**
     * @param {Object} data
     * @returns {Promise}
     */
    action_load: function (data) {
        return this._db.saveRecord("webclient", "actions", data);
    },

    /**
     * @param {Object} data
     * @returns {Promise}
     */
    translations: function (data) {
        return this._db.saveRecord("webclient", "userdata", {
            param: "translations",
            value: data,
        });
    },

    /**
     * Generic handle for post caching response
     *
     * @param {String} pathname
     * @param {Object} params
     */
    _generic_post: function (pathname, params, result) {
        return this._db.saveRecord("webclient", "post", {
            pathname: pathname,
            params: JSON.stringify(params),
            result: result,
        });
    },

    /**
     * Generic handle for function calls caching response
     *
     * @param {String} pathname
     * @param {Object} params
     */
    _generic_function: function (model, method, result, request_params) {
        return this._db.saveRecord("webclient", "function", {
            model: model,
            method: method,
            params: JSON.stringify(request_params.args),
            return: result,
        });
    },

    /** PREFETCH HELPERS **/

    /**
     * @param {Array[Object]} onchanges
     * @returns {Promise}
     */
    saveOnchanges: function (onchanges) {
        return new Promise(async (resolve) => {
            for (const onchange of onchanges) {
                await this._db.saveRecord("webclient", "onchange", {
                    model: onchange.model,
                    field: onchange.field,
                    params: JSON.stringify(onchange.params),
                    changes: onchange.changes,
                });
            }
            return resolve();
        });
    },

    /**
     * @param {Array[Object]} functions
     * @returns {Promise}
     */
    saveFunctions: function (functions) {
        return new Promise(async (resolve) => {
            for (const func of functions) {
                await this._db.saveRecord("webclient", "function", {
                    model: func.model,
                    method: func.method,
                    params: JSON.stringify(func.params),
                    return: func.result,
                });
            }
            return resolve();
        });
    },

    /** INTERNAL **/

    /**
     * Remove old records
     *
     * @param {String} model
     * @param {Array[int]} oids
     * @returns {Promise[Array[Number]]}
     */
    _vacuumRecords: function (model, oids) {
        return new Promise(async (resolve, reject) => {
            try {
                const [records] = await this._getModelRecords(model);
                const cur_ids = _.map(records, "id");
                const ids_to_remove = _.difference(oids, cur_ids);
                this._removeRecords(model, ids_to_remove);
                return resolve(ids_to_remove);
            } catch (err) {
                return reject(err);
            }
        });
    },
});
