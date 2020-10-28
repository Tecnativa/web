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
            try {
                const [records] = await this._getModelRecords(
                    model,
                    "[]",
                    data.kwargs.limit
                );
                const filtered_records = _.map(records, (item) =>
                    _.values(_.pick(item, ["id", "display_name"]))
                );
                return resolve(filtered_records);
            } catch (err) {
                return reject(err);
            }
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Array[Object]]}
     */
    name_get: function (model, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const [records] = await this._getModelRecords(model);
                let record_ids = data.args;
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
                if (!filtered_records.length) {
                    return reject();
                }
                filtered_records = _.map(filtered_records, (item) =>
                    _.values(_.pick(item, ["id", "display_name"]))
                );
                return resolve(filtered_records);
            } catch (err) {
                return reject(err);
            }
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
            let fields_changed = data.args[2];
            if (typeof fields_changed === "string") {
                fields_changed = [fields_changed];
            }
            const params = _.pick(modif_state, fields_changed);
            const res = {value: {}, warnings: []};
            try {
                const records = await this._db.getRecords("webclient", "onchange", [
                    model,
                    field_changed,
                    JSON.stringify(params),
                ]);
                const jscompiler = new JSSandbox();
                for (const record of records) {
                    const value = false;
                    const warnings = false;
                    if (typeof record.changes !== 'undefined') {
                        value = record.changes.value;
                        warnings = record.changes.warnings;
                    } else if (typeof record.formula !== 'undefined') {
                        jscompiler.compile(record.formula);
                        const changes = jscompiler.run(modif_state);
                        value = changes.value;
                        warnings = changes.warnings;
                        return resolve(changes);
                    }
                    if (value) {
                        res.value = _.extend(res.value, value);
                    }
                    if (warnings) {
                        res.warnings = _.union(res.warnings, warnings);
                    }
                }
            } catch (err) {
                // do nothing.
            }

            return resolve(res);
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Array[Object]]}
     */
    read: function (model, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const [records] = await this._getModelRecords(data.model);
                let filtered_records = _.filter(
                    records,
                    (item) => data.args[0].indexOf(item.id) !== -1
                );
                filtered_records = _.map(filtered_records, (item) =>
                    _.pick(item, ["id"].concat(data.args[1]))
                );
                return resolve(filtered_records);
            } catch (err) {
                return reject(err);
            }
        });
    },

    read_template: function (model, data) {
        return this.db.getRecord("webclient", "template", data.args[0]);
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Boolean]}
     */
    write: function (model, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const view_def = await this._db.getRecord("webclient", "views", model);
                await this._process_record_write(model, data, view_def.fields);
                return resolve(true);
            } catch (err) {
                return reject(err);
            }
        });
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Number/String]}
     */
    create: function (model, data) {
        return new Promise(async (resolve, reject) => {
            try {
                // Create Offline Record ids
                data.args = _.map(data.args, (item) =>
                    _.extend({id: this._genRecordID()}, item)
                );

                // Get context defaults
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
                        if (view_def && "relation" in view_def.fields[skey]) {
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
                const record_defaults = await this._db.getRecord(
                    "webclient",
                    "defaults",
                    model
                );

                const view_def = await this._db.getRecord("webclient", "views", model);
                const c_ids = await this._process_record_create(
                    model,
                    data,
                    _.extend({}, record_defaults.defaults, defaults),
                    view_def.fields
                );
                return resolve(c_ids.length === 1 ? c_ids[0] : c_ids);
            } catch (err) {
                return reject(err);
            }
        });
    },

    unlink: function (model, data) {
        return this._removeRecords(model, data.args[0]);
    },

    /**
     * @param {String} model
     * @param {Object} data
     * @returns {Promise[Object]}
     */
    default_get: function (model, data) {
        return new Promise(async (resolve, reject) => {
            try {
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
                const result = _.extend({}, record.defaults, defaults);
                return resolve(_.pick(result, data.args[0]));
            } catch (err) {
                return reject(err);
            }
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
        return new Promise(async (resolve, reject) => {
            try {
                const record = await this._db.getRecord("webclient", "views", model);
                const views = _.chain(data.kwargs.views).flatten().filter().value();
                const generic_view = _.pick(record.fields_views, "form");
                return resolve({
                    fields_views: _.extend(_.pick(record.fields_views, views), {
                        calendar: generic_view,
                        pivot: generic_view,
                    }),
                    fields: record.fields,
                });
            } catch (err) {
                return reject(err);
            }
        });
    },

    /**
     * @returns {Promise[Object]}
     */
    load_menus: function () {
        return new Promise(async (resolve, reject) => {
            try {
                const record = await this._db.getRecord(
                    "webclient",
                    "userdata",
                    "menus"
                );
                return resolve(record.value);
            } catch (err) {
                return reject(err);
            }
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
            let records = false,
                records_count = 0;
            try {
                [records, records_count] = await this._getModelRecords(
                    pmodel,
                    JSON.stringify(pdomain),
                    plimit,
                    poffset
                );
            } catch (err) {
                return reject(err);
            }
            records = _.map(records, (item) => _.pick(item, ["id"].concat(pfields)));
            if ("kwargs" in data) {
                return resolve(records);
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
    _generic_post: function (pathname, params) {
        return this._db.getRecord("webclient", "post", [
            pathname,
            JSON.stringify(params),
        ]);
    },

    /**
     * Generic handle for function calls caching response
     * @param {String} model
     * @param {String} method
     * @param {Object} params
     */
    _generic_function: function (model, method, params) {
        return this._db.getRecord("webclient", "function", [
            model,
            method,
            JSON.stringify(params),
        ]);
    },

    /**
     * Resolve Many2one
     * @param {*} record
     * @param {*} fields
     */
    _process_record_create: function (model, data, defaults, view_fields) {
        return new Promise(async (resolve) => {
            const records_sync = [];
            for (let index in data.args) {
                const record = _.extend({}, defaults, data.args[index]);
                // Write a temporal name
                if (record.name) {
                    record.name += ` (Offline Record #${record.id})`;
                } else {
                    record.name = `Offline Record #${record.id}`;
                }
                record.display_name = record.name;
                const record_fields = Object.keys(record);
                const processed_fields = [];
                const records_linked = {};
                for (const field of record_fields) {
                    if (view_fields[field].type === "one2many") {
                        const relation = view_fields[field].relation;
                        const view_def = await this._db.getRecord(
                            "webclient",
                            "views",
                            relation
                        );
                        const model_defaults = await this._db.getRecord(
                            "webclient",
                            "defaults",
                            relation
                        );
                        if (!records_linked[relation]) {
                            records_linked[relation] = [];
                        }
                        const ids_to_add = [];
                        const subrecords = [];
                        for (const command of record[field]) {
                            // create only have 0 command
                            if (command[0] === 0) {
                                let subrecord = command[2];
                                const subrecord_fields = Object.keys(subrecord);
                                const parent_field = _.findKey(view_def.fields, {
                                    required: true,
                                    relation: model,
                                });
                                subrecord = _.extend(
                                    {},
                                    model_defaults.defaults,
                                    subrecord
                                );
                                record.display_name = record.name;
                                subrecord[parent_field] = record.id;
                                subrecord.id = this._genRecordID();
                                // Write a temporal name
                                if (subrecord.name) {
                                    subrecord.name += ` (Offline Record #${subrecord.id})`;
                                } else {
                                    subrecord.name = `Offline Record #${subrecord.id}`;
                                }
                                subrecord.display_name = subrecord.name;
                                const link = {};
                                link[model] = [
                                    {
                                        field: field,
                                        id: record.id,
                                        change: subrecord.id,
                                    },
                                ];
                                records_sync.push({
                                    raw: {
                                        model: relation,
                                        method: "create",
                                        args: [subrecord],
                                    },
                                    date: new Date().getTime(),
                                    linked: link,
                                });
                                subrecord = await this._process_record_to_merge(
                                    subrecord,
                                    view_def.fields
                                );
                                // The order is not created yet, so.. ensure write
                                // their correct values
                                subrecord[parent_field] = [record.id, record.name];
                                subrecords.push(subrecord);
                                ids_to_add.push(subrecord.id);
                                records_linked[relation].push({
                                    field: parent_field,
                                    id: subrecord.id,
                                    change: record.id,
                                });
                            } else if (command[0] === 4) {
                                ids_to_add.push(command[1]);
                            } else if (command[0] === 5) {
                                ids_to_add = command[2];
                            }
                        }
                        record[field] = _.uniq(ids_to_add);
                        if (subrecords.length) {
                            await this._mergeModelRecord(relation, subrecords, "[]");
                            processed_fields.push(field);
                        }
                    }
                }

                // Add main record
                data.args[index] = await this._process_record_to_merge(
                    record,
                    view_fields
                );
                records_sync.splice(0, 0, {
                    raw: {
                        model: model,
                        method: "create",
                        args: [_.omit(record, processed_fields)],
                    },
                    date: new Date().getTime(),
                    linked: records_linked,
                });
                await this._db.saveRecords("webclient", "sync", records_sync);
            }

            await this._mergeModelRecord(model, data.args, "[]");
            return resolve(_.map(data.args, "id"));
        });
    },

    /**
     * Resolve Many2one
     * @param {*} record
     * @param {*} fields
     */
    _process_record_write: function (model, data, view_fields) {
        return new Promise(async (resolve) => {
            const records_sync = [];
            const modified_records = data.args[0];
            const modifications = data.args[1];
            for (let record_id of modified_records) {
                const record = await this._getModelRecord(model, record_id);
                const modified_fields = Object.keys(modifications);
                const processed_fields = [];
                for (const field of modified_fields) {
                    if (view_fields[field].type === "one2many") {
                        if (!record[field]) {
                            record[field] = [];
                        }
                        const relation = view_fields[field].relation;
                        const view_def = await this._db.getRecord(
                            "webclient",
                            "views",
                            relation
                        );
                        const model_defaults = await this._db.getRecord(
                            "webclient",
                            "defaults",
                            relation
                        );
                        const subrecords = [];
                        for (const command of modifications[field]) {
                            // create only have 0 command
                            if (command[0] === 0) {
                                let subrecord = command[2];
                                const subrecord_fields = Object.keys(subrecord);
                                const parent_field = _.findKey(view_def.fields, {
                                    required: true,
                                    relation: model,
                                });
                                subrecord = _.extend(
                                    {},
                                    model_defaults.defaults,
                                    subrecord
                                );
                                subrecord[parent_field] = record.id;
                                subrecord.id = this._genRecordID();
                                // Write a temporal name
                                if (subrecord.name) {
                                    subrecord.name += ` (Offline Record #${subrecord.id})`;
                                } else {
                                    subrecord.name = `Offline Record #${subrecord.id}`;
                                }
                                subrecord.display_name = subrecord.name;
                                const link = {};
                                link[model] = [
                                    {
                                        field: field,
                                        id: record.id,
                                        change: subrecord.id,
                                    },
                                ];
                                records_sync.push({
                                    raw: {
                                        model: relation,
                                        method: "create",
                                        args: [subrecord],
                                    },
                                    date: new Date().getTime(),
                                    linked: link,
                                });
                                subrecord = await this._process_record_to_merge(
                                    subrecord,
                                    view_def.fields
                                );
                                subrecords.push(subrecord);
                                record[field].push(subrecord.id);
                            } else if (command[0] === 1) {
                                records_sync.push({
                                    raw: {
                                        model: relation,
                                        method: "write",
                                        args: [[command[1]], command[2]],
                                    },
                                    date: new Date().getTime(),
                                });
                                const ref_record = await this._getModelRecord(
                                    relation,
                                    command[1]
                                );
                                const subrecord = await this._process_record_to_merge(
                                    command[2],
                                    view_def.fields
                                );
                                subrecords.push(_.extend(ref_record, subrecord));
                            } else if (command[0] === 2 || command[0] === 3) {
                                if (command[0] === 2) {
                                    records_sync.push({
                                        raw: {
                                            model: relation,
                                            method: "unlink",
                                            args: [[[command[1]]]],
                                        },
                                        date: new Date().getTime(),
                                    });
                                    this._removeRecords(relation, [command[1]]);
                                }
                                record[field] = _.reject(
                                    record[field],
                                    (item) => item === command[1]
                                );
                            } else if (command[0] === 4) {
                                record[field].push(command[1]);
                            } else if (command[0] === 5) {
                                record[field] = [];
                            } else if (command[0] === 6) {
                                record[field] = command[2];
                            }
                        }
                        if (subrecords.length) {
                            await this._mergeModelRecord(relation, subrecords, "[]");
                            processed_fields.push(field);
                        }
                        // Ensure unique values
                        record[field] = _.uniq(record[field]);
                    }
                }

                // Update main record
                records_sync.push({
                    raw: {
                        model: model,
                        method: "write",
                        args: [[record.id], _.pick(record, processed_fields)],
                    },
                    date: new Date().getTime(),
                });
                await this._db.saveRecords("webclient", "sync", records_sync);
                await this._mergeModelRecord(model, [record]);
            }
            return resolve(true);
        });
    },

    _process_record_to_merge: function (record, fields) {
        return new Promise(async (resolve, reject) => {
            const processed_record = _.clone(record);
            if (Object.keys(fields).length) {
                const data_fields = Object.keys(record);
                for (const field of data_fields) {
                    if (fields[field].type === "many2one") {
                        try {
                            const ref_record = await this._getModelRecord(
                                fields[field].relation,
                                record[field]
                            );
                            processed_record[field] = [
                                record[field],
                                ref_record.display_name || ref_record.name,
                            ];
                        } catch (err) {
                            console.log(
                                `[ServiceWorker] Can't process '${field}' field. Can't found the relational value.`
                            );
                        }
                    } else {
                        processed_record[field] = record[field];
                    }
                }
                return resolve(processed_record);
            }
            return reject();
        });
    },
});
