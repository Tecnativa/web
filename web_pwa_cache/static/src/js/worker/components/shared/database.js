/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

const DatabaseComponent = OdooClass.extend({
    /**
     * @param {IDBDatabase} database
     */
    init: function (database) {
        this._db = database;
    },

    /**
     * This method updates the 'webclient>records' store.
     * The changes will affect to records with the same id for all domains.
     * If the record doesn't exists in the selected domain it will be created.
     *
     * @param {String} model
     * @param {Object} data
     * @param {String} domain
     * @returns {Promise}
     */
    _mergeModelRecord: function (model, data, domain = "[]") {
        return new Promise(async (resolve, reject) => {
            const [objectStore] = this._db.getObjectStores(
                "webclient",
                ["records"],
                "readwrite"
            );
            if (objectStore) {
                const tasks = await new Promise((resolve, reject) => {
                    const query = objectStore.index("model").getAll(model);
                    query.onsuccess = function (evt) {
                        const tasks = [];
                        let mainUpdated = false;
                        for (const record of evt.target.result) {
                            if (record.domain === domain) {
                                mainUpdated = true;
                            }
                            let cur_records = record.records || {};
                            const records = [];
                            for (const rec of data) {
                                const obj = _.findWhere(cur_records, {id: rec.id});
                                if (!obj && record.domain !== domain) {
                                    continue;
                                }

                                records.push(_.extend({}, obj || {}, rec));
                            }
                            cur_records = _.reject(
                                cur_records,
                                (item) => _.findIndex(records, {id: item.id}) !== -1
                            );
                            tasks.push(
                                new Promise((resolve, reject) => {
                                    const request = objectStore.put(
                                        _.extend(record, {
                                            records: cur_records.concat(records),
                                        })
                                    );
                                    request.onsuccess = resolve;
                                    request.onerror = reject;
                                })
                            );
                        }
                        if (!mainUpdated) {
                            tasks.push(
                                new Promise((resolve, reject) => {
                                    const request = objectStore.add({
                                        model: model,
                                        domain: "[]",
                                        orderby: "id",
                                        records: data,
                                    });
                                    request.onsuccess = resolve;
                                    request.onerror = reject;
                                })
                            );
                        }

                        resolve(tasks);
                    };
                    query.onerror = function () {
                        reject();
                    };
                });
                await Promise.all(tasks);
                return resolve();
            } else {
                return reject();
            }
        });
    },

    /**
     * @param {String} model
     * @param {Number} rec_id
     * @param {Object} data
     * @returns {Promise}
     */
    _updateModelRecord: function (model, rec_id, data) {
        return new Promise((resolve, reject) => {
            const [objectStore] = this._db.getObjectStores(
                "webclient",
                ["records"],
                "readwrite"
            );
            if (objectStore) {
                const query = objectStore.get([model, "[]"]);
                query.onsuccess = function (evt) {
                    const srecords = evt.target.result?.records || [];
                    for (let record of srecords) {
                        if (record.id === rec_id) {
                            record = _.extend(record, data);
                            break;
                        }
                    }
                    const request = objectStore.put(
                        _.extend(evt.target.result, {records: srecords})
                    );
                    request.onsuccess = function () {
                        resolve();
                    };
                    request.onerror = function () {
                        reject();
                    };
                };
                query.onerror = function () {
                    reject();
                };
            } else {
                reject();
            }
        });
    },

    /**
     * @param {String} model
     * @param {String} domain
     * @param {Number} limit
     * @param {Number} offset
     * @return {Promise[Array[Object]]}
     */
    _getModelRecords: function (
        model,
        domain = "[]",
        limit = -1,
        offset = 0,
        orderby = "id"
    ) {
        const self = this;
        return new Promise(async (resolve, reject) => {
            const [objectStore] = this._db.getObjectStores(
                "webclient",
                ["records"],
                "readonly"
            );
            if (objectStore) {
                try {
                    const records = await new Promise((resolve, reject) => {
                        const query = objectStore.get([model, "[]"]);
                        query.onsuccess = function (evt) {
                            if (!evt.target.result) {
                                reject();
                            }
                            const srecords = evt.target.result?.records || [];
                            let records = self.queryRecords(srecords, domain);
                            const records_count = records.length;
                            const orders = orderby.split();
                            for (const order of orders) {
                                const order_parts = order.split(" ");
                                if (order_parts.length === 1) {
                                    order_parts.push("asc");
                                }

                                records = _.sortBy(records, order_parts[0].trim());
                                if (order_parts[1].trim().toLowerCase() === "asc") {
                                    records = records.reverse();
                                }
                            }
                            records = records.slice(
                                offset,
                                limit === -1 ? undefined : offset + limit
                            );
                            resolve([records, records_count]);
                        };
                        query.onerror = function (evt) {
                            reject();
                        };
                    });
                    resolve(records);
                } catch (err) {
                    reject(err);
                }
            }
            return reject();
        });
    },

    /**
     * @param {String} model
     * @param {Number} rec_id
     * @param {String} domain
     * @returns {Promise[Object]}
     */
    _getModelRecord: function (model, rec_id, domain = "[]") {
        return new Promise(async (resolve, reject) => {
            try {
                const [records] = await this._getModelRecords(model, domain);
                return resolve(_.findWhere(records, {id: rec_id}));
            } catch (err) {
                return reject();
            }
        });
    },

    /**
     * @param {String} model
     * @param {Array[Number]} rc_ids
     * @returns {Promise}
     */
    _removeRecords: function (model, rc_ids) {
        const self = this;
        return new Promise((resolve, reject) => {
            const [objectStore] = this._db.getObjectStores(
                "webclient",
                ["records"],
                "readwrite"
            );
            if (objectStore) {
                const query = objectStore.index("model").getAll(model);
                query.onsuccess = function (evt) {
                    for (const record of evt.target.result) {
                        const nrecords = self.queryRecords(record.records, [
                            ["id", "not in", rc_ids],
                        ]);
                        objectStore.put(_.extend(record, {records: nrecords}));
                    }
                    resolve();
                };
                query.onerror = function (evt) {
                    reject();
                };
            } else {
                reject();
            }
        });
    },

    /**
     * Basic implementation to query a collection using Odoo domain syntax
     * Doesn't support 'child_of' and '=?'!
     * @param {Array[Object]} records
     * @param {String|Array} domain
     * @returns {Array[Object]}
     */
    queryRecords: function (records, domain) {
        if (!records || !records.length) {
            return [];
        }
        let sdomain = domain || [];
        if (typeof sdomain === "string") {
            sdomain = JSON.parse(domain);
        }

        if (!sdomain.length) {
            return records;
        }

        const logic_oper = {
            "&": {
                arity: 2,
                fmrt: "(<%= l0 %> && <%= l1 %>)",
            },
            "|": {
                arity: 2,
                fmrt: "(<%= l0 %> || <%= l1 %>)",
            },
            "!": {
                arity: 1,
                fmrt: "!(<%= l0 %>)",
            },
        };

        // Omitted '=?' and 'child_of'
        const oper = {
            "=": function (leafL, leafR) {
                return leafL === leafR;
            },
            "!=": function (leafL, leafR) {
                return leafL !== leafR;
            },
            ">": function (leafL, leafR) {
                return leafL > leafR;
            },
            ">=": function (leafL, leafR) {
                return leafL >= leafR;
            },
            "<": function (leafL, leafR) {
                return leafL < leafR;
            },
            "<=": function (leafL, leafR) {
                return leafL <= leafR;
            },
            "=like": function (leafL, leafR) {
                const r = new RegExp(leafR.replace(/%/g, ".*").replace(/_/g, ".+"));
                return leafL.search(r) !== -1;
            },
            like: function (leafL, leafR) {
                const r = new RegExp(
                    `.*${leafR.replace(/%/g, ".*").replace(/_/g, ".+")}.*`
                );
                return leafL.search(r) !== -1;
            },
            "not like": function (leafL, leafR) {
                return !this["not like"](leafL, leafR);
            },
            "=ilike": function (leafL, leafR) {
                const r = new RegExp(
                    leafR.replace(/%/g, ".*").replace(/_/g, ".+"),
                    "i"
                );
                return leafL.search(r) !== -1;
            },
            ilike: function (leafL, leafR) {
                const r = new RegExp(
                    `.*${leafR.replace(/%/g, ".*").replace(/_/g, ".+")}.*`,
                    "i"
                );
                return leafL.search(r) !== -1;
            },
            "not ilike": function (leafL, leafR) {
                return !this["ilike"](leafL, leafR);
            },
            in: function (leafL, leafR) {
                return leafR.indexOf(leafL) !== -1;
            },
            "not in": function (leafL, leafR) {
                return !this["in"](leafL, leafR);
            },
        };

        const results = [];
        for (const record of records) {
            const doOper = (index_criteria = 0) => {
                const criteria = sdomain[index_criteria];
                let oper_def = logic_oper["&"];
                let offset = 0;
                if (typeof criteria === "string") {
                    oper_def = logic_oper[criteria];
                    ++offset;
                }
                const tparams = {};
                for (let e = 0; e < oper_def.arity; ++e) {
                    const ncriteria = sdomain[index_criteria + e + offset];
                    if (typeof ncriteria === "string") {
                        tparams[`l${e}`] = doOper(index_criteria + e + offset);
                    } else if (ncriteria) {
                        tparams[`l${e}`] = oper[ncriteria[1]](
                            this._getValueOrID(record[ncriteria[0]]),
                            ncriteria[2]
                        );
                    } else {
                        tparams[`l${e}`] = true;
                    }
                }

                if (index_criteria + oper_def.arity < sdomain.length) {
                    tparams["l0"] = _.template(oper_def.fmrt)(tparams);
                    tparams["l1"] = doOper(index_criteria + oper_def.arity + 1);
                }
                return _.template(oper_def.fmrt)(tparams);
            };

            // Run magic!
            const to_eval = doOper();
            console.log(to_eval);
            if (eval(to_eval)) {
                results.push(record);
            }
        }

        console.log("-- The domain");
        console.log(records);
        console.log(domain);
        return results;
    },

    _getValueOrID: function (value) {
        if (_.isArray(value)) {
            return value[0];
        }
        return value;
    },

    _genRecordID: function () {
        return 90000000 + new Date().getTime();
    },
});
