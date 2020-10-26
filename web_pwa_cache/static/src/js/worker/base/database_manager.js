/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

const DatabaseManager = OdooClass.extend({
    init: function () {
        this._databases = {};
    },

    /**
     * @param {String} db_name
     * @param {Function} onupgradedb
     * @returns {Promise[IDBDatabase]}
     */
    initDatabase: function (db_name, onupgradedb) {
        return new Promise(async (resolve, reject) => {
            if (this._databases[db_name]) {
                return resolve(this._databases[db_name]);
            }
            const db = await new Promise((resolve, reject) => {
                const dbreq = self.indexedDB.open(db_name, 1);
                dbreq.onsuccess = (evt) => {
                    resolve(evt.target.result);
                };
                dbreq.onerror = () => {
                    reject();
                };
                dbreq.onupgradeneeded = onupgradedb;
            });
            if (!db) {
                return reject(`Can't create the ${dn_name} database`);
            }
            this._databases[db_name] = db;
            return resolve(this._databases[db_name]);
        });
    },

    /**
     * @param {String} db_name
     * @returns {IDBDatabase}
     */
    get: function (db_name) {
        return this._databases[db_name];
    },

    /**
     * @param {String} db_name
     * @param {Array[String]} stores
     * @param {String} mode
     * @returns {IDBObjectStore}
     */
    getObjectStores: function (db_name, stores, mode) {
        const db = this.get(db_name);
        if (!db) {
            throw new Error("Database not found");
        }
        const transaction = db.transaction(stores, mode);
        const res = [];
        for (const store of stores) {
            res.push(transaction.objectStore(store));
        }
        return res;
    },

    /**
     * @param {String} db_name
     * @param {String} store
     * @param {IDBKeyRange/String} range
     * @returns {Promise[Object]}
     */
    getRecord: function (db_name, store, range) {
        return new Promise((resolve, reject) => {
            const [objectStore] = this.getObjectStores(db_name, [store], "readonly");
            if (objectStore) {
                const query = objectStore.get(range);
                query.onsuccess = function (evt) {
                    resolve(evt.target.result);
                };
                query.onerror = function () {
                    reject();
                };
            } else {
                return reject();
            }
        });
    },

    /**
     * @param {String} db_name
     * @param {String} store
     * @param {Any} value
     */
    saveRecord: function (db_name, store, value) {
        return this.saveRecords(db_name, store, [value]);
    },

    /**
     * @param {String} db_name
     * @param {String} store
     * @param {Array[Any]} values
     */
    saveRecords: function (db_name, store, values) {
        const [objectStore] = this.getObjectStores(db_name, [store], "readwrite");
        if (objectStore) {
            for (const value of values) {
                objectStore.put(value);
            }
            return Promise.resolve();
        }
        return Promise.reject();
    },

    updateRecord: function (db_name, store, index, range, value) {
        return new Promise((resolve, reject) => {
            const [objectStore] = this.getObjectStores(db_name, [store], "readwrite");
            if (objectStore) {
                const query = objectStore.index(index).getAll(range);
                query.onsuccess = function (evt) {
                    for (const record of evt.target.result) {
                        const nrecord = _.extend(record, value);
                        console.log("--- UPDATING");
                        console.log(nrecord);
                        objectStore.put(nrecord);
                    }
                    resolve();
                };
                query.onerror = function () {
                    reject();
                };
            } else {
                reject();
            }
        });
    },
});
