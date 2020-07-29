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
     */
    name_search: function (model, data) {
        const records = _.map(data, (record) => {
            return {id: record[0], display_name: record[1]};
        });
        this._mergeModelRecord(model, records);
    },

    /**
     * @param {String} model
     * @param {Object} data
     */
    name_get: function (model, data) {
        this.name_search(model, data);
    },

    /**
     * @param {String} model
     * @param {Object} data
     */
    load_views: function (model, data) {
        const [objectStore] = this._db.getObjectStores(
            "webclient",
            ["views"],
            "readwrite"
        );
        if (objectStore) {
            const vtype = Object.keys(data.fields_views)[0];
            objectStore.put(_.extend({model: data.fields_views[vtype].model}, data));
        }
    },

    /**
     * @param {String} model
     * @param {Object} data
     */
    default_get: function (model, data) {
        this._db.getRecord("webclient", "defaults", model).then((record) => {
            const [objectStore] = this._db.getObjectStores(
                "webclient",
                ["defaults"],
                "readwrite"
            );
            if (objectStore) {
                console.log("-- DEFAULT GET");
                console.log(data);
                console.log(_.extend({model: model}, record, data));
                objectStore.put(_.extend({model: model}, record, data));
            }
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     */
    read: function (model, data) {
        this._mergeModelRecord(model, data);
    },

    /**
     * @param {Object} data
     */
    action_load: function (data) {
        const [objectStore] = this._db.getObjectStores(
            "webclient",
            ["actions"],
            "readwrite"
        );
        if (objectStore) {
            objectStore.put(data);
        }
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @param {String} domain
     */
    search_read: function (model, data, domain) {
        console.log("-- SEARCH READ");
        console.log(data);
        if ('records' in data) {
            this._mergeModelRecord(model, data.records, domain);
        } else {
            this._mergeModelRecord(model, data, domain);
        }
    },
});
