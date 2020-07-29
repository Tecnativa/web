/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

/**
 * This class is used to get the necessary data to simulate the Odoo replies.
 * The name of the functions match with the name of the python implementation.
 */
const Exporter = DatabaseComponent.extend({
    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Array[Object]]}
     */
    name_search: async function(model, data) {
        return new Promise(async (resolve, reject) => {
            const records = await this._getModelRecords(model, "[]", data.kwargs.limit);
            if (records) {
                const filtered_records = _.map(records, item => _.values(_.pick(item, ["id", "display_name"])));
                resolve(filtered_records);
            }
            reject();
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Array[Object]]}
     */
    name_get: function(model, data) {
        return new Promise(async (resolve, reject) => {
            const records = await this._getModelRecords(model);
            if (records) {
                console.log("------ NAME GET");
                console.log(data);
                let record_ids = data.args;
                if (typeof record_ids[0] !== 'number') {
                    record_ids = record_ids[0];
                }
                let filtered_records = _.filter(records, item => record_ids.indexOf(item.id) !== -1);
                filtered_records = _.map(filtered_records, item => _.values(_.pick(item, ["id", "display_name"])));
                resolve(filtered_records);
            }
            reject();
        });
    },

    /**
     * No 'onchange' implementations
     *
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Boolean]}
     */
    onchange: function(model, data) {
        return new Promise(resolve => {
            resolve(true);
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Array[Object]]}
     */
    read: function(model, data) {
        return new Promise(async (resolve, reject) => {
            const records = await this._getModelRecords(data.model);
            if (records) {
                let filtered_records = _.filter(records, item => data.args[0].indexOf(item.id) !== -1);
                filtered_records = _.map(filtered_records, item => _.pick(item, ["id"].concat(data.args[1])));
                resolve(filtered_records);
            }
            reject();
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Boolean]}
     */
    write: function(model, data) {
        return new Promise(async resolve => {
            let [objectStore] = this._db.getObjectStores("webclient", ["sync"], "readonly");
            if (!objectStore) {
                reject();
            }
            for (const rec_id of data.args[0]) {
                const merge_data = {
                    id: rec_id,
                };
                // Try to update 'display_name'
                if ('name' in data.args[1]) {
                    const cur_record = await this._getModelRecord(model, rec_id);
                    merge_data.display_name = cur_record.display_name.replace(cur_record.name, data.args[1].name);
                }
                // Generate record with new values
                const record = _.extend(merge_data, data.args[1]);
                // Resolve X2Many commands
                // TODO: Improve this to resolve all commands!!!
                const view_def = await this._db.getRecord("webclient", "views", model);
                const data_fields = Object.keys(record);
                for (const field of data_fields) {
                    if (view_def.fields[field].type === "one2many") {
                        const svalues = []
                        for (const command of merge_data[field]) {
                            if (command[0] === 4) {
                                svalues.push(command[1]);
                            }
                        }
                        record[field] = svalues;
                    }
                }
                this._mergeModelRecord(model, [record], "[]");
            }
            [objectStore] = this._db.getObjectStores("webclient", ["sync"], "readwrite");
            if (!objectStore) {
                reject();
            }
            objectStore.put(data);
            resolve(true);
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Number/String]}
     */
    create: function(model, data) {
        return new Promise(async resolve => {
            const [objectStore] = this._db.getObjectStores("webclient", ["sync"], "readwrite");
            if (!objectStore) {
                reject();
            }
            // TODO: Use other id's!!
            const rec_id = 9000000000 + Number(_.uniqueId());
            data.args = _.map(data.args, item => _.extend({id: rec_id}, item));
            objectStore.put(data);
            const context_defaults = data.kwargs.context;
            const default_keys = _.filter(Object.keys(context_defaults), function (item) {
                return item.startsWith('default_');
            });
            const defaults = {}
            for (const key of default_keys) {
                const skey = key.substr(8);
                const svalue = context_defaults[key];
                if (typeof svalue !== 'object') {
                    let view_def = await this._db.getRecord("webclient", "views", model);
                    if ('relation' in view_def.fields[skey]) {
                        defaults[skey] = (await this.name_get(view_def.fields[skey].relation, {
                            args: [[context_defaults[key]]]
                        }))[0];
                    } else {
                        defaults[skey] = context_defaults[key];
                    }
                } else {
                    defaults[skey] = context_defaults[key];
                }
            }
            data.args = _.map(data.args, item => _.extend(item, defaults));
            data.args = _.map(data.args, item => _.extend({display_name: item.name}, item));
            this._mergeModelRecord(model, data.args, "[]");
            resolve(rec_id);
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Object]}
     */
    default_get: function(model, data) {
        var self = this;
        return new Promise(async resolve => {
            let record = await this._db.getRecord("webclient", "defaults", model);

            const context_defaults = data.kwargs.context;
            const default_keys = _.filter(Object.keys(context_defaults), function (item) {
                return item.startsWith('default_');
            });
            const defaults = {}
            for (const key of default_keys) {
                const skey = key.substr(8);
                // const svalue = context_defaults[key];
                // if (typeof svalue !== 'object') {
                //     let view_def = await this._db.getRecord("webclient", "views", model);
                //     if ('relation' in view_def.fields[skey]) {
                //         console.log("----- PIDE NAME GET");
                //         console.log(context_defaults[key]);
                //         defaults[skey] = await self.name_get(model, {
                //             args: [[context_defaults[key]]]
                //         });
                //     } else {
                //         defaults[skey] = context_defaults[key];
                //     }
                // } else {
                    defaults[skey] = context_defaults[key];
                // }
            }
            record = _.extend({}, record, defaults);
            resolve(_.pick(record, data.args[0]));
        });
    },

    /**
     * @param {Object} data
     * @returns {Promise[Object]}
     */
    action_load: function(data) {
        return new Promise(async (resolve, reject) => {
            const [objectStore] = this._db.getObjectStores("webclient", ["actions"], "readonly");
            if (!objectStore) {
                reject();
            }
            const record = await new Promise((resolve, reject) => {
                const query = objectStore.get(data.action_id);
                query.onsuccess = evt => {
                    resolve(evt.target.result);
                };
                query.onerror = () => {
                    reject();
                };
            });
            if (record) {
                resolve(record);
            }
            reject();
        });
    },

    /**
     * @param {String} model
     * @returns {Promise[Object]}
     */
    load_views: function(model) {
        return new Promise(async (resolve, reject) => {
            const [objectStore] = this._db.getObjectStores("webclient", ["views"], "readonly");
            if (!objectStore) {
                reject();
            }
            const record = await new Promise((resolve, reject) => {
                const query = objectStore.get(model);
                query.onsuccess = function(evt) {
                    resolve(evt.target.result);
                };
                query.onerror = function(evt) {
                    reject();
                };
            });
            if (record) {
                resolve(record);
            }
            reject();
        });
    },

    /**
     * @param {Object} data
     * @returns {Promise[Object]}
     */
    search_read: function(model, data) {
        return new Promise(async (resolve, reject) => {
            let pmodel = data.model;
            let pdomain = data.domain;
            let pfields = data.fields;
            let plimit = data.limit;
            let poffset = data.offset;
            if ('kwargs' in data) {
                pfields = data.kwargs.fields;
                pdomain = data.kwargs.domain;
                plimit = data.kwargs.limit;
                poffset = data.kwargs.offset;
            }
            let records = await this._getModelRecords(pmodel, JSON.stringify(pdomain), plimit, poffset);
            if (!records) {
                reject();
            }
            records = _.map(records, item => _.pick(item, ["id"].concat(pfields)));
            if ('kwargs' in data) {
                resolve(records);
            }
            resolve({
                length: records.length,
                records: records,
            });
        });
    },
});
