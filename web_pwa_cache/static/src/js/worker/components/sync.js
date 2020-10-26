/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

/**
 * This class is used to manage sync operations
 */
const Sync = DatabaseComponent.extend({
    /**
     * @returns {Promise}
     */
    getSyncRecords: function() {
        return new Promise((resolve, reject) => {
            const [objectStore] = this._db.getObjectStores("webclient", ["sync"], "readonly");
            if (objectStore) {
                const query = objectStore.getAll();
                query.onsuccess = function(evt) {
                    resolve(evt.target.result || []);
                };
                query.onerror = function() {
                    reject();
                };
            } else {
                reject();
            }
        });
    },

    /**
     * @returns {Promise}
     */
    getSyncRecordsWithKey: function() {
        return new Promise((resolve, reject) => {
            const [objectStore] = this._db.getObjectStores("webclient", ["sync"], "readwrite");
            if (objectStore) {
                const records = [];
                const cursor = objectStore.openCursor();
                cursor.onsuccess = function(evt) {
                    var cursor = evt.target.result;
                    if (cursor) {
                        records.push({
                            key: cursor.key,
                            value: cursor.value
                        });
                        cursor.continue();
                    } else {
                        resolve(records);
                    }
                };
                cursor.onerror = function() {
                    reject();
                };
            } else {
                reject();
            }
        });
    },

    /**
     * @param {Number} key
     * @param {Object} data
     * @returns {Promise}
     */
    updateSyncRecord: function (key, data) {
        return new Promise((resolve, reject) => {
            const [objectStore] = this._db.getObjectStores("webclient", ["sync"], "readwrite");
            if (objectStore) {
                const cursor = objectStore.openCursor();
                cursor.onsuccess = function(evt) {
                    var cursor = evt.target.result;
                    if (cursor) {
                        if (cursor.key === key) {
                            cursor.update(_.extend(cursor.value,data));
                            resolve();
                        } else {
                            cursor.continue();
                        }
                    }
                };
                cursor.onerror = function() {
                    reject();
                };
            } else {
                reject();
            }
        });
    },

    /**
     * @param {Array[Number]} keys
     * @returns {Promise}
     */
    removeSyncRecords: function (keys) {
        return new Promise((resolve, reject) => {
            const [objectStore] = this._db.getObjectStores("webclient", ["sync"], "readwrite");
            if (objectStore) {
                const cursor = objectStore.openCursor();
                cursor.onsuccess = function(evt) {
                    var cursor = evt.target.result;
                    if (cursor) {
                        if (keys.indexOf(cursor.key) !== -1) {
                            cursor.delete();
                        }
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                cursor.onerror = function() {
                    reject();
                };
            } else {
                reject();
            }
        });
    },
});
