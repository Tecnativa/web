/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

/**
 * This class is used to store pwa configuration parameters
 */
const Config = DatabaseComponent.extend({
    /**
     * @returns {Promise[Object]}
     */
    start: function () {
        this.state = {};
        return new Promise(async resolve => {
            this.state = await this.getAll();
            return resolve(true);
        });
    },

    /**
     * @returns {Promise[Object]}
     */
    getAll: function () {
        return new Promise((resolve, reject) => {
            const [objectStore] = this._db.getObjectStores("webclient", ["config"], "readonly");
            if (objectStore) {
                const query = objectStore.getAll();
                query.onsuccess = function(evt) {
                    const config_records = {}
                    for (const record of evt.target.result) {
                        config_records[record.name] = record.value;
                    }
                    resolve(config_records);
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
     * @returns {Boolean}
     */
    isOfflineMode: function () {
        return this.state?.pwa_mode === 'offline';
    },

    /**
     * @returns {Boolean}
     */
    isStandaloneMode: function () {
        return this.state?.standalone;
    },

    /**
     * @param {String} name
     * @returns {Promise[Any]}
     */
    get: function (name, def_value = undefined) {
        return new Promise(async resolve => {
            const value = (await this._db.getRecord("webclient", "config", name))?.value;
            this.state[name] = value;
            return resolve(typeof value === 'undefined' ? def_value : value);
        });
    },

    /**
     * @param {String} name
     * @param {Any} value
     * @returns {Promise}
     */
    set: function (name, value) {
        this.state[name] = value;
        return this._db.saveRecord("webclient", "config", {
            param: name,
            value: value,
        });
    },
});
