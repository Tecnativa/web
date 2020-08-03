/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

const DatabaseComponent = OdooClass.extend({
    /**
     * @param {IDBDatabase} database
     */
    init: function(database) {
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
     */
    _mergeModelRecord: function(model, data, domain="[]") {
        const [objectStore] = this._db.getObjectStores("webclient", ["records"], "readwrite");
        if (objectStore) {
            const query = objectStore.index("model").getAll(model);
            query.onsuccess = function(evt) {
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

                        //records.push(_deepObjectExtend(obj, rec));
                        records.push(_.extend({}, obj || {}, rec));
                    }
                    cur_records = _.reject(cur_records, item => _.findIndex(records, {id: item.id}) !== -1);
                    objectStore.put({model: model, domain: record.domain, records: cur_records.concat(records)});
                }
                if (!mainUpdated) {
                    objectStore.add({model: model, domain: domain, records: data});
                }
            };
        }
    },

    /**
     * @param {String} model
     * @param {String} domain
     * @param {Number} limit
     * @param {Number} offset
     * @return {Promise[Array[Object]]}
     */
    _getModelRecords: function(model, domain="[]", limit=-1, offset=0) {
        const self = this;
        return new Promise(async (resolve, reject) => {
            const [objectStore] = this._db.getObjectStores("webclient", ["records"], "readonly");
            if (objectStore) {
                resolve(await new Promise((resolve, reject) => {
                    const query = objectStore.get([model, "[]"]);
                    query.onsuccess = function(evt) {
                        const records = evt.target.result.records.slice(offset, limit===-1?undefined:offset+limit);
                        resolve(self.queryRecords(records, domain))
                    };
                    query.onerror = function(evt) {
                        reject();
                    };
                }));
            }
            reject();
        });
    },

    /**
     * @param {String} model
     * @param {Number} rec_id
     * @param {String} domain
     * @returns {Promise[Object]}
     */
    _getModelRecord: function(model, rec_id, domain="[]") {
        return new Promise(async (resolve, promise) => {
            const records = this._getModelRecords(model, domain);
            if (records) {
                resolve(_.findWhere(records, {id: rec_id}));
            }
            reject();
        });
    },

    /**
     * Basic implementation to query a collection using Odoo domain syntax
     * Doesn't support 'child_of'!
     * @param {Array[Object]} records
     * @param {String|Array} domain
     * @returns {Array[Object]}
     */
    queryRecords: function(records, domain) {
        let sdomain = [];
        if (typeof domain === 'string') {
            sdomain = JSON.parse(domain);
        } else if (domain) {
            sdomain = domain;
        }

        if (!sdomain.length) {
            return records;
        }

        // ['|','|',[fieldA,'=',10],[fieldB,'=',20],[fieldC,'=',30],[fieldD,'=',40]]

        // (fieldA == 10 || fieldB == 20) || (fieldC == 30 && fieldD == 40)

        const logic_oper = {
            '&': {
                arity: 2,
                fmrt: "(<%= l0 %> && <%= l1 %>)",
            },
            '|': {
                arity: 2,
                fmrt: "(<%= l0 %> || <%= l1 %>)",
            },
            '!': {
                arity: 1,
                fmrt: "!(<%= l0 %>)",
            },
        };

        // Omitted '=?' and 'child_of'
        const oper = {
            '=': function (leafL, leafR) { return leafL === leafR; },
            '!=': function (leafL, leafR) { return leafL !== leafR; },
            '>': function (leafL, leafR) { return leafL > leafR; },
            '>=': function (leafL, leafR) { return leafL >= leafR; },
            '<': function (leafL, leafR) { return leafL < leafR; },
            '<=': function (leafL, leafR) { return leafL <= leafR; },
            '=like': function (leafL, leafR) {
                const r = new RegExp(leafR.replace(/%/g,'.*').replace(/_/g,'.+'));
                return leafL.search(r) !== -1;
            },
            'like': function (leafL, leafR) {
                const r = new RegExp(`.*${leafR.replace(/%/g,'.*').replace(/_/g,'.+')}.*`);
                return leafL.search(r) !== -1;
            },
            'not like': function (leafL, leafR) {
                return !this['not like'](leafL, leafR);
            },
            '=ilike': function (leafL, leafR) {
                const r = new RegExp(leafR.replace(/%/g,'.*').replace(/_/g,'.+'), "i");
                return leafL.search(r) !== -1;
            },
            'ilike': function (leafL, leafR) {
                const r = new RegExp(`.*${leafR.replace(/%/g,'.*').replace(/_/g,'.+')}.*`, "i");
                return leafL.search(r) !== -1;
            },
            'not ilike': function (leafL, leafR) {
                return !this['ilike'](leafL, leafR);
            },
            'in': function (leafL, leafR) {
                return leafR.indexOf(leafL) !== -1;
            },
            'not in': function (leafL, leafR) {
                return !this['in'](leafL, leafR);
            }
        }

        const results = [];
        for (const record of records) {
            let cur_oper = logic_oper['&'];
            let cur_arity = cur_oper.arity;
            let cur_criterias = [];
            const doOper = function() {
                const tparams = {};
                for (let e=0; e<cur_oper.arity; ++e) {
                    tparams[`l${e}`] = cur_criterias[e];
                }
                cur_oper = logic_oper['&'];
                cur_arity = cur_oper.arity;
                cur_criterias = [_.template(cur_oper.fmrt)(tparams)];
            };
            for (let i = sdomain.length-1; i >= 0; --i) {
                const criteria = sdomain[i];
                if (typeof criteria === 'string' || !cur_arity) {
                    if (cur_arity) {
                        cur_oper = logic_oper[criteria];
                    }
                    doOper();
                } else {
                    cur_criterias.unshift(oper[criteria[1]](this._getValueOrID(record[criteria[0]]), criteria[2]));
                }
                --cur_arity;
            }

            if (cur_criterias.length > 1) {
                doOper();
            }

            if (eval(cur_criterias[0])) {
                results.push(record);
            }
        }

        return results;
    },

    _getValueOrID: function (value) {
        if (_.isArray(value)) {
            return value[0];
        }
        return value;
    },

    _deepObjectExtend: function(target, source) {
        for (var prop in source) {
            if (prop in target) {
                this._deepObjectExtend(target[prop], source[prop]);
            } else {
                target[prop] = source[prop];
            }
        }
        return target;
    }
});
