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
    name_search: function (model, data) {
        return new Promise(async (resolve, reject) => {
            const [records] = await this._getModelRecords(model, "[]", data.kwargs.limit);
            if (records) {
                const filtered_records = _.map(records, (item) =>
                    _.values(_.pick(item, ["id", "display_name"]))
                );
                return resolve(filtered_records);
            }
            return reject();
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Array[Object]]}
     */
    name_get: function (model, data) {
        return new Promise(async (resolve, reject) => {
            const [records] = await this._getModelRecords(model);
            if (records) {
                let record_ids = data.args;
                console.log("---- NAME GET");
                console.log(data);
                console.log(record_ids);
                if (!record_ids || !_.some(record_ids)) {
                    return resolve([]);
                }
                if (typeof record_ids[0] !== "number") {
                    record_ids = record_ids[0];
                }
                let filtered_records = _.filter(
                    records,
                    (item) => record_ids.indexOf(item.id) !== -1
                );
                filtered_records = _.map(filtered_records, (item) =>
                    _.values(_.pick(item, ["id", "display_name"]))
                );
                return resolve(filtered_records);
            }
            return reject();
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Boolean]}
     */
    onchange: function (model, data) {
        return new Promise(async (resolve) => {
            const modif_state = data.args[1];
            const field_changed = data.args[2];
            const params = {};
            params[field_changed] = modif_state[field_changed];
            const record = await this._db.getRecord("webclient", "onchange", [model, field_changed, JSON.stringify(params)]);
            if (!record) {
                return resolve({value:{}});
            }
            return resolve(record.changes);
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Array[Object]]}
     */
    read: function (model, data) {
        return new Promise(async (resolve, reject) => {
            const [records] = await this._getModelRecords(data.model);
            if (records) {
                console.log("----- READ");
                console.log(records);
                let filtered_records = _.filter(
                    records,
                    (item) => data.args[0].indexOf(item.id) !== -1
                );
                filtered_records = _.map(filtered_records, (item) =>
                    _.pick(item, ["id"].concat(data.args[1]))
                );

                for (const record of filtered_records) {
                    // Resolve x2x fields
                    const view_def = await this._db.getRecord("webclient", "views", model);
                    const data_fields = Object.keys(record);
                    for (const field of data_fields) {
                        if (view_def.fields[field].type === "one2many") {
                            const svalues = [];
                            for (const command of record[field]) {
                                // TODO: Improve this to resolve all commands!!!
                                if (command[0] === 4) {
                                    svalues.push(command[1]);
                                }
                            }
                            record[field] = svalues;
                        } else if (view_def.fields[field].type === "many2one") {
                            const ref_record = await this._getModelRecord(view_def.fields[field].relation, this._getValueOrID(record[field]));
                            if (ref_record) {
                                record[field] = [record[field], ref_record.display_name || ref_record.name];
                            }
                        }
                    }
                }

                console.log(filtered_records);
                return resolve(filtered_records);
            }
            return reject();
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Boolean]}
     */
    write: function (model, data) {
        return new Promise(async (resolve) => {
            for (const rec_id of data.args[0]) {
                const merge_data = {
                    id: rec_id,
                };
                // Try to update 'display_name'
                if ("name" in data.args[1]) {
                    const cur_record = await this._getModelRecord(model, rec_id);
                    merge_data.display_name = cur_record.display_name.replace(
                        cur_record.name,
                        data.args[1].name
                    );
                }
                // Generate record with new values
                const record = _.extend(merge_data, data.args[1]);
                // Resolve x2x fields
                const view_def = await this._db.getRecord("webclient", "views", model);
                const data_fields = Object.keys(record);
                for (const field of data_fields) {
                    if (view_def.fields[field].type === "one2many") {
                        const svalues = [];
                        for (const command of merge_data[field]) {
                            // TODO: Improve this to resolve all commands!!!
                            if (command[0] === 4) {
                                svalues.push(command[1]);
                            }
                        }
                        record[field] = svalues;
                    } else if (view_def.fields[field].type === "many2one") {
                        const ref_record = await this._getModelRecord(view_def.fields[field].relation, merge_data[field]);
                        record[field] = [merge_data[field], ref_record.display_name || ref_record.name];
                    }
                }
                await this._mergeModelRecord(model, [record], "[]");
            }
            this._db.saveRecord("webclient", "sync", {
                raw: data,
                date: (new Date()).getTime(),
            });
            return resolve(true);
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Number/String]}
     */
    create: function (model, data) {
        return new Promise(async (resolve) => {
            // TODO: Use other id's!!
            // Create Offline Record
            data.args = _.map(data.args, (item) => _.extend({id: 9000000000 + Number(_.uniqueId())}, item));
            const context_defaults = data.kwargs.context;
            const default_keys = _.filter(Object.keys(context_defaults), function (
                item
            ) {
                return item.startsWith("default_");
            });
            const defaults = {};
            for (const key of default_keys) {
                const skey = key.substr(8); // 8 > Omit 'default_'
                const svalue = context_defaults[key];
                if (typeof svalue !== "object") {
                    let view_def = await this._db.getRecord(
                        "webclient",
                        "views",
                        model
                    );
                    if ("relation" in view_def.fields[skey]) {
                        defaults[skey] = (
                            await this.name_get(view_def.fields[skey].relation, {
                                args: [[context_defaults[key]]],
                            })
                        )[0];
                    } else {
                        defaults[skey] = context_defaults[key];
                    }
                } else {
                    defaults[skey] = context_defaults[key];
                }
            }
            // Store Sync Record
            this._db.saveRecord("webclient", "sync", {
                raw: data,
                date: (new Date()).getTime(),
            });
            data.args = _.map(data.args, (item) => _.extend(item, defaults));
            data.args = _.map(data.args, (item) => {
                if (!item.name) {
                    item.name = `Offline Record #${item.id}`;
                }
                return _.extend({display_name: item.name}, item);
            });
            console.log(data.args);
            await this._mergeModelRecord(model, data.args, "[]");
            const c_ids = _.map(data.args, "id");
            return resolve(c_ids.length === 1?c_ids[0]:c_ids);
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Object]}
     */
    default_get: function (model, data) {
        return new Promise(async (resolve) => {
            let record = await this._db.getRecord("webclient", "defaults", model);

            const context_defaults = data.kwargs.context;
            const default_keys = _.filter(Object.keys(context_defaults), function (
                item
            ) {
                return item.startsWith("default_");
            });
            const defaults = {};
            for (const key of default_keys) {
                const skey = key.substr(8);
                defaults[skey] = context_defaults[key];
            }
            record = _.extend({}, record, defaults);
            return resolve(_.pick(record, data.args[0]));
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise}
     */
    get_filters: function (model, data) {
        return this._db.getRecord("webclient", "filters", data.args[0]);
    },

    /**
     * @param {String} model
     * @returns {Promise[Object]}
     */
    load_views: function (model, data) {
        return new Promise(async (resolve) => {
            const record = await this._db.getRecord("webclient", "views", model);
            const views = _.chain(data.kwargs.views).flatten().filter().value();
            const generic_view = _.pick(record.fields_views, "form");
            return resolve({
                "fields_views": _.extend(_.pick(record.fields_views, views), {
                    calendar: generic_view,
                    pivot: generic_view,
                }),
                "fields": record.fields,
            });
        });
    },

    /**
     * @returns {Promise[Object]}
     */
    load_menus: function () {
        return new Promise(async (resolve) => {
            const record = await this._db.getRecord("webclient", "userdata", "menus");
            return resolve(record && record.value || {});
        });
    },

    /**
     * Offline mode (all rights)
     */
    check_access_rights: function () {
        return Promise.resolve(true);
    },

    /**
     * Offline mode (all groups)
     */
    has_group: function () {
        return Promise.resolve(true);
    },

    /**
     * Offline mode (can't know this info)
     */
    xmlid_to_res_id: function () {
        return Promise.resolve(0);
    },

    /**
     * @param {Object} data
     * @returns {Promise[Object]}
     */
    action_load: function (data) {
        return this._db.getRecord("webclient", "actions", data.action_id);
    },

    /**
     * @returns {Promise[Object]}
     */
    translations: function () {
        return this._db.getRecord("webclient", "userdata", "translations");
    },

    /**
     * @param {Object} data
     * @returns {Promise[Object]}
     */
    search_read: function (model, data) {
        return new Promise(async (resolve, reject) => {
            let pmodel = data.model;
            let pdomain = data.domain;
            let pfields = data.fields;
            let plimit = data.limit;
            let poffset = data.offset;
            if ("kwargs" in data) {
                pfields = data.kwargs.fields;
                pdomain = data.kwargs.domain;
                plimit = data.kwargs.limit;
                poffset = data.kwargs.offset;
            }
            let [records, records_count] = await this._getModelRecords(
                pmodel,
                JSON.stringify(pdomain),
                plimit,
                poffset
            );
            if (!records) {
                return reject();
            }
            records = _.map(records, (item) => _.pick(item, ["id"].concat(pfields)));
            if ("kwargs" in data) {
                return resolve(records);
            }
            // Resolve x2x fields
            for (const record of records) {
                const view_def = await this._db.getRecord("webclient", "views", pmodel);
                const data_fields = Object.keys(record);
                for (const field of data_fields) {
                    if (view_def.fields[field].type === "one2many") {
                        const svalues = [];
                        for (const command of record[field]) {
                            // TODO: Improve this to resolve all commands!!!
                            if (command[0] === 4) {
                                svalues.push(command[1]);
                            }
                        }
                        record[field] = svalues;
                    } else if (view_def.fields[field].type === "many2one" && typeof record[field] === "number") {
                        const ref_record = await this._getModelRecord(view_def.fields[field].relation, record[field]);
                        record[field] = [record[field], ref_record.display_name || ref_record.name];
                    }
                }
            }

            return resolve({
                length: records_count,
                records: records,
            });
        });
    },

    /**
     * Generic handle for post caching response
     * @param {String} pathname
     * @param {Object} params
     */
    post_generic: function (pathname, params) {
        return this._db.getRecord("webclient", "post", [
            pathname,
            JSON.stringify(params),
        ]);
    },
});
