/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */

odoo.define("web_pwa_cache.PWA.core.DatabaseManager", function(require) {
    "use strict";

    const ParentedMixin = require("web.mixins").ParentedMixin;
    const OdooClass = require("web.Class");
    const SQLiteDB = require("web_pwa_cache.PWA.core.db.SQLiteDB");
    const IndexedDB = require("web_pwa_cache.PWA.core.db.IndexedDB");
    const JSSandbox = require("web_pwa_cache.PWA.core.base.JSSandbox");

    const DatabaseManager = OdooClass.extend(ParentedMixin, {
        _sqlite_db_name: "oca_pwa_sqlite",
        _indexed_db_name: "oca_pwa_indexed",

        /**
         * @override
         * @param {OdooClass} parent
         */
        init: function(parent) {
            ParentedMixin.init.call(this);
            this.setParent(parent);
            this.sqlitedb = new SQLiteDB(this, this._sqlite_db_name);
            this.indexeddb = new IndexedDB(this, this._indexed_db_name);
            this.model_infos = {};
        },

        install: function() {
            return Promise.all([this.sqlitedb.install()]);
        },

        /**
         * @returns {Promise}
         */
        start: function() {
            return Promise.all([
                this.sqlitedb.start(this._onStartSQLiteDB.bind(this)),
                this.indexeddb.start(this._onStartIndexedDB.bind(this)),
            ]).then(() => {
                this.updateModelInfos();
            });
        },

        updateModelInfos: function() {
            return this.sqlitedb
                .getModelInfo(false, false, true)
                .then(model_infos => {
                    this.model_infos = model_infos;
                })
                .catch(() => {
                    this.model_infos = {};
                });
        },

        getModelInfo: function(model_names, internal, grouped) {
            if (!model_names) {
                return _.values(this.model_infos);
            }
            if (typeof model_names === "string") {
                model_names = [model_names];
            }
            if (internal) {
                model_names = _.map(model_names, model_name =>
                    this.sqlitedb.getInternalTableName(model_name)
                );
            }

            let records = [];
            if (grouped) {
                records = _.pick(this.model_infos, model_names);
            } else {
                records = _.chain(this.model_infos)
                    .pick(model_names)
                    .values()
                    .value();
            }
            return records.length === 1 ? records[0] : records;
        },

        // -------------------
        // DB SCHEMAS
        // -------------------

        /**
         * Creates the schema of the used database:
         *  - views: Store views
         *  - actions: Store actions
         *  - sync: Store transactions to synchronize
         *  - config: Store PWA configurations values
         *  - functions: Store function calls results
         *  - post: Store post calls results
         *  - userdata: Store user data configuration values
         *  - onchange: Store onchange values
         *  - template: Store templates
         *  - model_metadata: Store model information
         *
         * @private
         * @param {SQLiteTag} db
         * @returns {Promise}
         */
        _onStartSQLiteDB: function(db) {
            return new Promise(async (resolve, reject) => {
                console.log("[ServiceWorker] Generating SQLite DB Schema...");
                try {
                    const model_info_model_metadata = {
                        table: this.sqlitedb.getInternalTableName("model_metadata"),
                        model: this.sqlitedb.getInternalTableName("model_metadata"),
                        internal: true,
                        fields: {
                            id: {type: "integer", store: true},
                            model: {type: "char", store: true},
                            name: {type: "char", store: true},
                            internal: {type: "boolean", store: true},
                            orderby: {type: "char", store: true},
                            rec_name: {type: "char", store: true},
                            fields: {type: "json", store: true},
                            view_types: {type: "json", store: true},
                            parent_store: {type: "char", store: true},
                            parent_name: {type: "char", store: true},
                            inherits: {type: "json", store: true},
                            table: {type: "char", store: true},
                            prefetch_last_update: {type: "datetime", store: true},
                            defaults: {type: "json", store: true},
                        },
                    };
                    await this.sqlitedb.createTable(model_info_model_metadata);
                    await db.query([
                        `CREATE UNIQUE INDEX IF NOT EXISTS model_metadata_model ON ${this.sqlitedb.getInternalTableName(
                            "model_metadata"
                        )} (model)`,
                    ]);
                    await this.sqlitedb.createOrUpdateRecord(
                        model_info_model_metadata,
                        model_info_model_metadata,
                        ["model"]
                    );

                    const model_info_views = {
                        table: this.sqlitedb.getInternalTableName("views"),
                        model: this.sqlitedb.getInternalTableName("views"),
                        internal: true,
                        fields: {
                            id: {type: "integer", store: true},
                            name: {type: "char", store: true},
                            type: {type: "char", store: true},
                            model: {type: "char", store: true},
                            fields: {type: "json", store: true},
                            base_model: {type: "char", store: true},
                            field_parent: {type: "char", store: true},
                            toolbar: {type: "json", store: true},
                            arch: {type: "char", store: true},
                            view_id: {type: "integer", store: true},
                            standalone: {type: "boolean", store: true},
                            is_default: {type: "boolean", store: true},
                        },
                    };
                    await this.sqlitedb.createTable(model_info_views);
                    await db.query([
                        `CREATE UNIQUE INDEX IF NOT EXISTS views_model_view_id_type ON ${this.sqlitedb.getInternalTableName(
                            "views"
                        )} (model, view_id, type, is_default)`,
                    ]);
                    await this.sqlitedb.createOrUpdateRecord(
                        model_info_model_metadata,
                        model_info_views,
                        ["model"]
                    );

                    const model_info_sync = {
                        table: this.sqlitedb.getInternalTableName("sync"),
                        model: this.sqlitedb.getInternalTableName("sync"),
                        internal: true,
                        fields: {
                            id: {type: "integer", store: true},
                            model: {type: "char", store: true},
                            method: {type: "string", store: true},
                            args: {type: "json", store: true},
                            date: {type: "datetime", store: true},
                            linked: {type: "json", store: true},
                            kwargs: {type: "json", store: true},
                        },
                    };
                    await this.sqlitedb.createTable(model_info_sync);
                    await this.sqlitedb.createOrUpdateRecord(
                        model_info_model_metadata,
                        model_info_sync,
                        ["model"]
                    );

                    const model_info_config = {
                        table: this.sqlitedb.getInternalTableName("config"),
                        model: this.sqlitedb.getInternalTableName("config"),
                        internal: true,
                        fields: {
                            id: {type: "integer", store: true},
                            param: {type: "char", store: true},
                            value: {type: "json", store: true},
                        },
                    };
                    await this.sqlitedb.createTable(model_info_config);
                    await db.query([
                        `CREATE UNIQUE INDEX IF NOT EXISTS config_param ON ${this.sqlitedb.getInternalTableName(
                            "config"
                        )} (param)`,
                    ]);
                    await this.sqlitedb.createOrUpdateRecord(
                        model_info_model_metadata,
                        model_info_config,
                        ["model"]
                    );

                    const model_info_function = {
                        table: this.sqlitedb.getInternalTableName("function"),
                        model: this.sqlitedb.getInternalTableName("function"),
                        internal: true,
                        fields: {
                            id: {type: "integer", store: true},
                            model: {type: "char", store: true},
                            method: {type: "char", store: true},
                            params: {type: "json", store: true},
                            result: {type: "json", store: true},
                        },
                    };
                    await this.sqlitedb.createTable(model_info_function);
                    await db.query([
                        `CREATE UNIQUE INDEX IF NOT EXISTS function_model_method_params ON ${this.sqlitedb.getInternalTableName(
                            "function"
                        )} (model, method, params)`,
                    ]);
                    await this.sqlitedb.createOrUpdateRecord(
                        model_info_model_metadata,
                        model_info_function,
                        ["model"]
                    );

                    const model_info_post = {
                        table: this.sqlitedb.getInternalTableName("post"),
                        model: this.sqlitedb.getInternalTableName("post"),
                        internal: true,
                        fields: {
                            id: {type: "integer", store: true},
                            pathname: {type: "char", store: true},
                            params: {type: "json", store: true},
                            result: {type: "json", store: true},
                        },
                    };
                    await this.sqlitedb.createTable(model_info_post);
                    await db.query([
                        `CREATE UNIQUE INDEX IF NOT EXISTS post_pathname_params ON ${this.sqlitedb.getInternalTableName(
                            "post"
                        )} (pathname, params)`,
                    ]);
                    await this.sqlitedb.createOrUpdateRecord(
                        model_info_model_metadata,
                        model_info_post,
                        ["model"]
                    );

                    const model_info_userdata = {
                        table: this.sqlitedb.getInternalTableName("userdata"),
                        model: this.sqlitedb.getInternalTableName("userdata"),
                        internal: true,
                        fields: {
                            id: {type: "integer", store: true},
                            param: {type: "char", store: true},
                            value: {type: "json", store: true},
                        },
                    };
                    await this.sqlitedb.createTable(model_info_userdata);
                    await db.query([
                        `CREATE UNIQUE INDEX IF NOT EXISTS userdata_param ON ${this.sqlitedb.getInternalTableName(
                            "userdata"
                        )} (param)`,
                    ]);
                    await this.sqlitedb.createOrUpdateRecord(
                        model_info_model_metadata,
                        model_info_userdata,
                        ["model"]
                    );

                    const model_info_onchange = {
                        table: this.sqlitedb.getInternalTableName("onchange"),
                        model: this.sqlitedb.getInternalTableName("onchange"),
                        internal: true,
                        fields: {
                            id: {type: "integer", store: true},
                            model: {type: "char", store: true},
                            field: {type: "char", store: true},
                            params: {type: "json", store: true},
                            changes: {type: "json", store: true},
                            formula: {type: "text", store: true},
                            triggers: {type: "char", store: true},
                            field_value: {type: "json", store: true},
                        },
                    };
                    await this.sqlitedb.createTable(model_info_onchange);
                    await db.query([
                        `CREATE INDEX IF NOT EXISTS onchange_model_field_field_value ON ${this.sqlitedb.getInternalTableName(
                            "onchange"
                        )} (model, field, field_value)`,
                    ]);
                    await this.sqlitedb.createOrUpdateRecord(
                        model_info_model_metadata,
                        model_info_onchange,
                        ["model"]
                    );

                    const model_info_template = {
                        table: this.sqlitedb.getInternalTableName("template"),
                        model: this.sqlitedb.getInternalTableName("template"),
                        internal: true,
                        fields: {
                            id: {type: "integer", store: true},
                            xml_ref: {type: "char", store: true},
                            template: {type: "text", store: true},
                        },
                    };
                    await this.sqlitedb.createTable(model_info_template);
                    await db.query([
                        `CREATE UNIQUE INDEX IF NOT EXISTS template_xml_ref ON ${this.sqlitedb.getInternalTableName(
                            "template"
                        )} (xml_ref)`,
                    ]);
                    await this.sqlitedb.createOrUpdateRecord(
                        model_info_model_metadata,
                        model_info_template,
                        ["model"]
                    );

                    const model_info_defaults = {
                        table: this.sqlitedb.getInternalTableName("defaults"),
                        model: this.sqlitedb.getInternalTableName("defaults"),
                        internal: true,
                        fields: {
                            id: {type: "integer", store: true},
                            model: {type: "char", store: true},
                            formula: {type: "text", store: true},
                        },
                    };
                    await this.sqlitedb.createTable(model_info_defaults);
                    await this.sqlitedb.createOrUpdateRecord(
                        model_info_model_metadata,
                        model_info_defaults,
                        ["model"]
                    );
                } catch (err) {
                    return reject(err);
                }

                console.log("[ServiceWorker] SQLite DB Schema generated successfully");
                return resolve();
            });
        },

        /**
         * Creates the schema of the used database:
         *  - binary: Store records to improve
         *                search performance
         *
         * @private
         * @param {IDBDatabaseEvent} evt
         */
        _onStartIndexedDB: function(evt) {
            console.log("[ServiceWorker] Generating Indexed DB Schema...");
            const db = evt.target.result;
            if (evt.oldVersion < 1) {
                // New Database
                const store = db.createObjectStore("binary", {
                    keyPath: ["model", "id"],
                    unique: true,
                });
                store.createIndex("model", "model", {unique: false});
            } else {
                // Upgrade Database
                // switch (evt.oldVersion) {
                //     case 1: {
                //         console.log("[ServiceWorker] Updating Old DB Schema to v2...");
                //         ...
                //     }
                //     case 2: {
                //         console.log("[ServiceWorker] Updating Old DB Schema to v3...");
                //         ...
                //     }
                // }
            }
        },

        // -------------------
        // RECORDS
        // -------------------

        /**
         * @param {Object/String} model_info
         * @param {Array} datas
         * @returns {Promise}
         */
        create: function(model_info, datas) {
            return new Promise(async (resolve, reject) => {
                try {
                    const tasks = [];
                    if (typeof model_info === "string") {
                        model_info = this.getModelInfo(model_info);
                    }
                    if (!(datas instanceof Array)) {
                        datas = [datas];
                    }
                    const binary_fields = this._getFieldNamesByType(
                        model_info,
                        "binary"
                    );
                    for (const values of datas) {
                        tasks.push(
                            this.sqlitedb.createRecord(
                                model_info,
                                _.omit(values, binary_fields)
                            )
                        );
                        if (binary_fields.length) {
                            tasks.push(
                                this.indexeddb.createRecord(
                                    "binary",
                                    _.chain(values)
                                        .pick(_.union(["id"], binary_fields))
                                        .extend({
                                            model: model_info.model,
                                            id: values.id,
                                        })
                                        .value()
                                )
                            );
                        }
                    }
                    await Promise.all(tasks);
                    return resolve();
                } catch (err) {
                    return reject(err);
                }
            });
        },

        /**
         * @param {Object/String} model_info
         * @param {Array} rc_ids
         * @param {Object} data
         * @returns {Promise}
         */
        write: function(model_info, rc_ids, data) {
            return new Promise(async (resolve, reject) => {
                try {
                    if (typeof model_info === "string") {
                        model_info = this.getModelInfo(model_info);
                    }

                    const sdata = _.omit(data, "id");
                    const binary_fields = this._getFieldNamesByType(
                        model_info,
                        "binary"
                    );
                    const tasks = [];
                    for (const id of rc_ids) {
                        tasks.push(
                            this.sqlitedb.updateRecord(
                                model_info,
                                [id],
                                _.chain(sdata)
                                    .omit(binary_fields)
                                    .value()
                            )
                        );
                        if (binary_fields.length) {
                            tasks.push(
                                this.indexeddb.updateRecords(
                                    "binary",
                                    false,
                                    [model_info.model, id],
                                    _.chain(sdata)
                                        .pick(_.union(["id"], binary_fields))
                                        .extend({model: model_info.model, id: id})
                                        .value()
                                )
                            );
                        }
                    }
                    const res = await Promise.all(tasks);
                    return resolve(res);
                } catch (err) {
                    return reject(err);
                }
            });
        },

        /**
         * @private
         * @param {Object/String} model_info
         * @param {Array} datas
         * @returns {Promise}
         */
        writeOrCreate: function(model_info, datas) {
            return new Promise(async resolve => {
                try {
                    if (typeof model_info === "string") {
                        model_info = this.getModelInfo(model_info);
                    }

                    const binary_fields = this._getFieldNamesByType(
                        model_info,
                        "binary"
                    );
                    const tasks = [];
                    for (const values of datas) {
                        tasks.push(
                            this.sqlitedb.createOrUpdateRecord(
                                model_info,
                                _.chain(values)
                                    .omit(binary_fields)
                                    .value(),
                                ["id"]
                            )
                        );
                        if (binary_fields.length) {
                            tasks.push(
                                this.indexeddb.createOrUpdateRecord(
                                    "binary",
                                    false,
                                    [model_info.model, values.id],
                                    _.chain(values)
                                        .pick(_.union(["id"], binary_fields))
                                        .extend({model: model_info.model})
                                        .value()
                                )
                            );
                        }
                    }
                    await Promise.all(tasks);
                } catch (err) {
                    // Do nothing
                    console.log("------------ THE ERROR", err);
                }

                return resolve();
            });
        },

        /**
         * @param {Object/String} model_info
         * @param {Array} rc_ids
         * @returns {Promise}
         */
        unlink: function(model_info, rc_ids) {
            return new Promise(async (resolve, reject) => {
                try {
                    if (typeof model_info === "string") {
                        model_info = this.getModelInfo(model_info);
                    }

                    await this.sqlitedb.deleteRecords(model_info, rc_ids);
                    try {
                        if (_.isEmpty(rc_ids)) {
                            const records = await this.indexeddb.getRecords(
                                "binary",
                                "model",
                                model_info.model
                            );
                            for (const record of records) {
                                await this.indexeddb.deleteRecord("binary", [
                                    model_info.model,
                                    record.id,
                                ]);
                            }
                        } else {
                            for (const id of rc_ids) {
                                await this.indexeddb.deleteRecord("binary", [
                                    model_info.model,
                                    id,
                                ]);
                            }
                        }
                    } catch (err) {
                        // Do nothing
                        console.log("---- ERR: ", err);
                    }
                } catch (err) {
                    console.log("------- THE ERRRO: ", err);
                    return reject(err);
                }
                return resolve();
            });
        },

        /**
         * @param {Object/String} model_info
         * @param {Array} domain
         * @param {Number} limit
         * @param {Array} fields
         * @param {Number} offset
         * @param {String} orderby (Example: "name DESC, city, sequence ASC")
         * @param {Boolean} count
         * @returns {Promise}
         */
        search: function(
            model_info,
            domain,
            limit,
            fields,
            offset,
            orderby,
            count = false
        ) {
            return new Promise(async (resolve, reject) => {
                try {
                    if (typeof model_info === "string") {
                        model_info = this.getModelInfo(model_info);
                    }
                    if (!model_info) {
                        return reject("Model info not found!");
                    }
                    const records = await this.sqlitedb._osv.query(
                        model_info,
                        domain || [],
                        offset,
                        limit,
                        orderby,
                        fields,
                        count
                    );
                    if (count) {
                        return resolve(records);
                    }
                    if (_.isEmpty(records)) {
                        return resolve(limit === 1 ? undefined : []);
                    }
                    this.sqlitedb.converter.toOdoo(model_info.fields, records);
                    return resolve(limit === 1 ? records[0] : records);
                } catch (err) {
                    return reject(err);
                }
            });
        },

        /**
         * @param {Object/String} model_info
         * @param {Array} domain
         * @param {Number} limit
         * @param {Array} fields
         * @param {Number} offset
         * @param {String} orderby (Example: "name DESC, city, sequence ASC")
         * @returns {Promise}
         */
        search_read: function(model_info, domain, limit, fields, offset, orderby) {
            return new Promise(async (resolve, reject) => {
                try {
                    if (typeof model_info === "string") {
                        model_info = this.getModelInfo(model_info);
                    }

                    const records = await this.search(
                        model_info,
                        domain,
                        limit,
                        fields || [],
                        offset,
                        orderby
                    );
                    return resolve(records);
                } catch (err) {
                    console.log("ERRRR: ", err);
                    return reject(err);
                }
            });
        },

        /**
         * @param {Object/String} model_info
         * @param {Number/Array} rc_ids
         * @returns {Promise}
         */
        browse: function(model_info, rc_ids) {
            return new Promise(async (resolve, reject) => {
                try {
                    if (typeof model_info === "string") {
                        model_info = this.getModelInfo(model_info);
                    }

                    if (!model_info) {
                        return reject(`The model has not found!`);
                    }

                    const s_rc_ids = rc_ids instanceof Array ? rc_ids : [rc_ids];
                    const records = await this.sqlitedb.getRecords(
                        model_info,
                        s_rc_ids
                    );
                    if (_.isEmpty(records)) {
                        return resolve(_.isNumber(rc_ids) ? undefined : []);
                    }
                    return resolve(_.isNumber(rc_ids) ? records[0] : records);
                } catch (err) {
                    return reject(err);
                }
            });
        },

        /**
         * @param {String} model
         * @param {Number} rc_id
         * @returns {Promise}
         */
        browseBinary: function(model, rc_id) {
            return this.indexeddb.getRecord("binary", false, [model, rc_id]);
        },

        /**
         * @param {Object} model_info
         * @param {Array} domain
         * @returns {Promise}
         */
        count: function(model_info, domain) {
            return this.search(model_info, domain, false, false, false, false, true);
        },

        /**
         * @param {String} xmlid
         * @returns {Promise}
         */
        ref: function(xmlid) {
            return new Promise(async (resolve, reject) => {
                try {
                    const model_data = await this.getModelData(xmlid);
                    let record = {};
                    if (model_data.model.startsWith("ir.actions.")) {
                        const model_info = this.getModelInfo("actions", true);
                        record = await this.browse(model_info, model_data.res_id);
                    } else {
                        const records = await this.browse(
                            model_data.model,
                            model_data.res_id
                        );
                        if (records.length) {
                            record = records[0];
                        }
                    }

                    if (_.isEmpty(record)) {
                        return reject();
                    }

                    return resolve(record);
                } catch (err) {
                    return reject(err);
                }
            });
        },

        /**
         * @param {Object/String} model_info
         * @param {Number} uid
         * @param {Number} action_id
         * @returns {Promise}
         */
        getModelFilters: function(model_info, uid, action_id) {
            return new Promise(async (resolve, reject) => {
                try {
                    if (typeof model_info === "string") {
                        model_info = this.getModelInfo(model_info);
                    }

                    const action_domain = [];
                    if (action_id) {
                        action_domain.push(["action_id", "in", [action_id, false]]);
                    }
                    const records = await this.search_read(
                        "ir.filters",
                        _.union(action_domain, [
                            ["model_id", "=", model_info.model],
                            ["user_id", "in", [uid, false]],
                        ])
                    );
                    if (!records.length) {
                        return resolve([]);
                    }
                    const filters = _.map(records, item =>
                        _.pick(item, [
                            "name",
                            "is_default",
                            "domain",
                            "context",
                            "user_id",
                            "sort",
                        ])
                    );
                    return resolve(filters);
                } catch (err) {
                    return reject(err);
                }
            });
        },

        /**
         * @param {Object/String} model_info
         * @param {Number} uid
         * @param {Array} views
         * @param {Object} options
         * @returns {Promise}
         */
        getFieldsViews: function(model_info, uid, views, options) {
            return new Promise(async (resolve, reject) => {
                try {
                    if (typeof model_info === "string") {
                        model_info = this.getModelInfo(model_info);
                    }

                    const res = {};
                    if (options && options.load_filters) {
                        res.filters = await this.getModelFilters(
                            model_info,
                            uid,
                            options.action_id
                        );
                        if (_.isEmpty(res.filters)) {
                            res.filters = {};
                        }
                    }

                    const n_views = views;
                    if (options.standalone) {
                        n_views.push([false, "formPWA"]);
                    }
                    res.fields = model_info.fields;
                    res.fields_views = {};
                    const model_info_views = this.getModelInfo("views", true);
                    for (const [view_id, view_type] of n_views) {
                        let domain = [
                            ["model", "=", model_info.model],
                            ["type", "=", view_type === "list" ? "tree" : view_type],
                        ];
                        if (view_id) {
                            domain = domain.concat([
                                ["is_default", "=", false],
                                ["view_id", "=", view_id],
                            ]);
                        } else {
                            domain.push(["is_default", "=", true]);
                        }
                        res.fields_views[view_type] = await this.search_read(
                            model_info_views,
                            domain,
                            1
                        );
                        if (_.isEmpty(res.fields_views[view_type])) {
                            // If not view found fallback to form view
                            res.fields_views[view_type] = await this.search_read(
                                model_info_views,
                                [
                                    ["model", "=", model_info.model],
                                    ["is_default", "=", true],
                                    ["type", "=", "form"],
                                ],
                                1
                            );
                        }

                        // If can't get all views definitions, we
                        // return an empty result to trigger the Odoo response
                        if (_.isEmpty(res.fields_views[view_type])) {
                            return resolve([]);
                        }
                    }
                    if (!options || !options.toolbar) {
                        const view_types = Object.keys(res.fields_views);
                        for (const view_type of view_types) {
                            res.fields_views[view_type] = _.omit(
                                res.fields_views[view_type],
                                "toolbar"
                            );
                        }
                    }

                    if (options.standalone && "formPWA" in res.fields_views) {
                        res.fields_views.form = res.fields_views.formPWA;
                    }

                    return resolve(res);
                } catch (err) {
                    return reject(err);
                }
            });
        },

        /**
         * @param {Object/String} model_info
         * @param {Array} fields
         * @param {String} type
         * @returns {Promise}
         */
        getModelFieldsInfo: function(model_info, fields, type) {
            return new Promise(async (resolve, reject) => {
                try {
                    if (typeof model_info === "string") {
                        model_info = this.getModelInfo(model_info);
                    }

                    if (!fields) {
                        fields = _.keys(model_info.fields);
                    }
                    const field_infos = {};
                    for (const field of fields) {
                        if (!type || model_info.fields[field].type === type) {
                            field_infos[field] = model_info.fields[field];
                        }
                    }
                    return resolve(field_infos);
                } catch (err) {
                    return reject(err);
                }
            });
        },

        read_subscription_data: function(res_model, follower_id) {
            return new Promise(async (resolve, reject) => {
                try {
                    const followers = await this._dbmanager.browse("mail.followers", [
                        follower_id,
                    ]);
                    const followers_subtypes = _.chain(followers)
                        .map("subtype_ids")
                        .flatten()
                        .value();

                    // Find current model subtypes, add them to a dictionary
                    const subtypes = await this._dbmanager.search(
                        "mail.message.subtype",
                        [
                            "&",
                            ("hidden", "=", false),
                            "|",
                            ("res_model", "=", res_model),
                            ("res_model", "=", false),
                        ]
                    );
                    let subtypes_list = [];
                    for (const subtype of subtypes) {
                        const subtype_parent_id = await this._dbmanager.browse(
                            "res.partner",
                            [subtype.parent_id[0]]
                        );
                        subtypes_list.push({
                            name: subtype.name,
                            res_model: subtype.res_model,
                            sequence: subtype.sequence,
                            default: subtype.default,
                            internal: subtype.internal,
                            followed: subtype.id in followers_subtypes,
                            parent_model: subtype_parent_id.res_model,
                            id: subtype.id,
                        });
                    }
                    subtypes_list = _.chain(subtypes_list)
                        .orderBy("parent_model")
                        .orderBy("res_model")
                        .orderBy("internal")
                        .orderBy("sequence")
                        .value();
                    return resolve(subtypes_list);
                } catch (err) {
                    return reject(err);
                }
            });
        },

        /**
         *
         * @param {Object/String} model_info
         * @param {Number} rec_id
         * @returns {Promise}
         */
        isOfflineRecord: function(model_info, rec_id) {
            return new Promise(async resolve => {
                try {
                    if (typeof model_info === "string") {
                        model_info = this.getModelInfo(model_info);
                    }
                    const model_info_sync = this.getModelInfo("sync", true);
                    const sync_records = await this.search_read(model_info_sync, [
                        ["model", "=", model_info.model],
                        ["method", "=", "create"],
                    ]);
                    const record = _.findWhere(
                        sync_records,
                        record => record.args[0].id === rec_id
                    );
                    if (record) {
                        return resolve(true);
                    }
                    return resolve(false);
                } catch (err) {
                    return resolve(false);
                }
            });
        },

        /**
         * Generates a temporal id for offline records.
         * Odoo only works with numbers.
         *
         * @returns {Number}
         */
        genRecordID: function() {
            return 90000000 + new Date().getTime();
        },

        // -------------------
        // HELPERS
        // -------------------

        /**
         * @param {String} xmlid
         * @returns {Promise}
         */
        getModelData: function(xmlid) {
            return new Promise(async (resolve, reject) => {
                const module_name = xmlid.split(".", 1)[0];
                const name = xmlid.substr(module_name.length + 1);
                try {
                    const records = await this.search_read(
                        "ir.model.data",
                        [
                            ["module", "=", module_name],
                            ["name", "=", name],
                        ],
                        1
                    );
                    return resolve(records[0]);
                } catch (err) {
                    return reject(err);
                }
            });
        },

        /**
         * @param {Object/String} model_info
         * @returns {Promise}
         */
        getModelDefaults: function(model_info) {
            return new Promise(async (resolve, reject) => {
                try {
                    if (typeof model_info === "string") {
                        model_info = this.getModelInfo(model_info);
                    }

                    const values = model_info.defaults || {};
                    const model_info_defaults = this.getModelInfo("defaults", true);
                    let records = [];
                    try {
                        records = await this.search_read(model_info_defaults, [
                            ["model", "=", model_info.model],
                        ]);
                    } catch (err) {
                        // Do nothing
                    }
                    const sandbox = new JSSandbox();
                    for (const record of records) {
                        if (typeof record.formula !== "undefined") {
                            sandbox.compile(record.formula);
                            _.extend(values, sandbox.run());
                        }
                    }
                    if (_.isEmpty(values)) {
                        return reject();
                    }
                    return resolve(values);
                } catch (err) {
                    return reject(err);
                }
            });
        },

        /**
         * Remove old records
         *
         * @param {String} model
         * @param {Array} oids
         * @returns {Promise}
         */
        vacuumRecords: function(model, oids) {
            return new Promise(async (resolve, reject) => {
                try {
                    const records = await this.search_read(model, []);
                    const cur_ids = _.map(records, "id");
                    const ids_to_remove = _.difference(oids, cur_ids);
                    if (!_.isEmpty(ids_to_remove)) {
                        await this.unlink(model, ids_to_remove);
                    }
                    return resolve(ids_to_remove);
                } catch (err) {
                    return reject(err);
                }
            });
        },

        /**
         * @private
         * @param {Object} model_info
         * @param {String} field_type
         * @returns {Promise}
         */
        _getFieldNamesByType: function(model_info, field_type) {
            return _.chain(model_info.fields)
                .pick(item => item.type === field_type)
                .keys()
                .value();
        },
    });

    return DatabaseManager;
});
