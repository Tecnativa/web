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
     * @param {Number} index
     * @param {Object} data
     * @returns {Promise}
     */
    updateSyncRecord: function (index, data) {
        return new Promise((resolve, reject) => {
            const [objectStore] = this._db.getObjectStores("webclient", ["sync"], "readwrite");
            if (objectStore) {
                let cur_iter = 0;
                const cursor = objectStore.openCursor();
                cursor.onsuccess = function(evt) {
                    var cursor = evt.target.result;
                    if (cursor) {
                        if (cur_iter === Number(index)) {
                            cursor.update(data);
                            resolve();
                        } else {
                            ++cur_iter;
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
     * @param {Number} index
     * @returns {Promise}
     */
    removeSyncRecord: function (index) {
        return new Promise((resolve, reject) => {
            const [objectStore] = this._db.getObjectStores("webclient", ["sync"], "readwrite");
            if (objectStore) {
                let cur_iter = 0;
                const cursor = objectStore.openCursor();
                cursor.onsuccess = function(evt) {
                    var cursor = evt.target.result;
                    if (cursor) {
                        if (cur_iter === Number(index)) {
                            cursor.delete();
                            resolve();
                        } else {
                            ++cur_iter;
                            cursor.continue();
                        }
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
