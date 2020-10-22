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
            this._db.saveRecord(
                "webclient",
                "defaults",
                _.extend({model: model}, record, data)
            );
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

    /**
     * @param {String} model
     * @param {Object} data
     * @param {Object} request_params
     * @returns {Promise}
     */
    get_filters: function (model, data, request_params) {
        return this._db.saveRecord("webclient", "filters", {model: request_params.args[0], filters: data});
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
    post_generic: function (pathname, params, result) {
        console.log("---- SAVE GENERIC POST");
        console.log(pathname);
        console.log(params);
        console.log(result);
        return this._db.saveRecord("webclient", "post", {
            pathname: pathname,
            params: JSON.stringify(params),
            result: result,
        });
    },

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
