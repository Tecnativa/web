/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

/**
 * This class is used to store pwa configuration parameters
 */
const Config = DatabaseComponent.extend({
    start: function () {
        this.state = {};
        return new Promise(async resolve => {
            this.state = await this.getAll();
            console.log("--- CONFIG START");
            console.log(this.state);
            return resolve(true);
        });
    },

    getAll: function () {
        console.log("---- GET ALLL!!");
        return new Promise(async resolve => {
            return resolve({
                pwa_mode: await this.get("pwa_mode", "online"),
            });
        });
    },

    isOfflineMode: function () {
        return this.state?.pwa_mode === 'offline';
    },

    /**
     * Gets a configuration parameter
     *
     * @param {String} name
     * @returns {Promise[Any]}
     */
    get: function (name, def_value = undefined) {
        return new Promise(async resolve => {
            const value = (await this._db.getRecord("webclient", "config", name))?.value;
            return resolve(typeof value === 'undefined' ? def_value : value);
        });
    },

    /**
     * Sets a configuration parameter
     *
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
