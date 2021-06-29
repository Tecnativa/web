/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */

odoo.define("web_pwa_cache.PWA.managers.Config", function(require) {
    "use strict";

    const SWManager = require("web_pwa_cache.PWA.managers.Manager");
    const BroadcastMixin = require("web_pwa_cache.BroadcastMixin");

    /**
     * This class is used to store pwa configuration parameters
     */
    const SWConfigManager = SWManager.extend(BroadcastMixin, {
        /**
         * @override
         */
        init: function() {
            this.init_broadcast("pwa-sw-messages", "pwa-page-messages");
            this._super.apply(this, arguments);
            this._cache = {};
        },

        /**
         * @override
         */
        install: function() {
            return this.getAll();
        },

        /**
         * @returns {Boolean}
         */
        isOfflineMode: function() {
            return (
                typeof this._cache.pwa_mode !== "undefined" &&
                this._cache.pwa_mode !== "online"
            );
        },

        /**
         * @returns {Boolean}
         */
        isStandaloneMode: function() {
            return this._cache.standalone;
        },

        /**
         * @returns {Number}
         */
        getUID: function() {
            return this._cache.uid;
        },

        /**
         * @returns {Number}
         */
        getPartnerID: function() {
            return this._cache.partner_id;
        },

        /**
         * @returns {Number}
         */
        getLang: function() {
            return this._cache.lang;
        },

        /**
         * @param {String} name
         * @returns {Promise[Any]}
         */
        get: function(name, def_value) {
            return new Promise(async resolve => {
                try {
                    const model_info_config = await this._db.getModelInfo("config", true);
                    const record = await this._db.search_read(
                        model_info_config,
                        [["param", "=", name]],
                        1
                    );
                    const value = record && record.value;
                    this._cache[record.param] = value;
                    return resolve(typeof value === "undefined" ? def_value : value);
                } catch (err) {
                    return resolve(null);
                }
            });
        },

        /**
         * @returns {Promise[Object]}
         */
        getAll: function() {
            return new Promise(async (resolve, reject) => {
                try {
                    const model_info_config = await this._db.getModelInfo("config", true);
                    const records = await this._db.search_read(model_info_config, []);
                    this._cache = {};
                    for (const record of records) {
                        this._cache[record.param] = record.value;
                    }
                    return resolve(this._cache);
                } catch (err) {
                    return reject(err);
                }
            });
        },

        /**
         * @param {String} param
         * @param {Any} value
         * @returns {Promise}
         */
        set: function(param, value) {
            return new Promise(async (resolve, reject) => {
                try {
                    const model_info_config = await this._db.getModelInfo("config", true);
                    await this._db.sqlitedb.createOrUpdateRecord(
                        model_info_config,
                        {
                            param: param,
                            value: value,
                        },
                        ["param"]
                    );
                    console.log(
                        `[ServiceWorker] Configuration ${param} changed: ${this._cache[param]} -> ${value}`
                    );
                    this._cache[param] = value;
                } catch (err) {
                    return reject();
                }

                return resolve();
            });
        },

        /**
         * Send configuration state to the client pages
         *
         * @private
         * @returns {Promise}
         */
        sendToPages: function() {
            return new Promise(async (resolve, reject) => {
                try {
                    const config = await this.getAll();
                    const model_info_userdata = await this._db.getModelInfo("userdata", true);
                    const userdata_count = await this._db.count(model_info_userdata);
                    config.is_db_empty = userdata_count === 0;
                    this.postBroadcastMessage({
                        type: "PWA_INIT_CONFIG",
                        data: config,
                    });
                } catch (err) {
                    return reject(err);
                }
                return resolve();
            });
        },

        _onReceiveBroadcastMessage: function(evt) {
            const res = BroadcastMixin._onReceiveBroadcastMessage.call(this, evt);
            if (!res || !this.isLoaded()) {
                return;
            }
            switch (evt.data.type) {
                // This message is received when the user page was loaded or the user changes the pwa mode.
                // The process can be:
                // - User has no 'userdata'. This means that the prefeteching process hasn't been done
                //   so we run it the first time.
                // - User change the pwa mode to 'online'. This means that we can try to prefetch data.
                case "SET_PWA_CONFIG":
                    const promises = [];
                    const changes = {};
                    let keys = Object.keys(evt.data);
                    keys = _.filter(keys, item => item !== "type");
                    for (const key of keys) {
                        changes[key] = evt.data[key];
                        promises.push(this.set(key, changes[key]));
                    }
                    Promise.all(promises)
                        .then(() => {
                            new Promise(async resolve => {
                                this.postBroadcastMessage({
                                    type: "PWA_CONFIG_CHANGED",
                                    changes: changes,
                                });
                                // Check if need prefetch data
                                const event_online =
                                    typeof evt.data.pwa_mode !== "undefined" &&
                                    evt.data.pwa_mode === "online";
                                const config_offline = this.isOfflineMode();
                                const config_standalone = this.isStandaloneMode();
                                const is_online =
                                    event_online ||
                                    (typeof evt.data.pwa_mode === "undefined" &&
                                        !config_offline);
                                const is_standalone =
                                    (typeof evt.data.standalone !== "undefined" &&
                                        evt.data.standalone) ||
                                    (typeof evt.data.standalone === "undefined" &&
                                        config_standalone);
                                // Check if need do prefetch (Auto-Prefetch)
                                const model_info_userdata = await this._db.getModelInfo(
                                    "userdata",
                                    true
                                );
                                const userdata_count = await this._db.count(
                                    model_info_userdata,
                                    []
                                );
                                if (
                                    (is_online && is_standalone && !userdata_count) ||
                                    (event_online && is_standalone)
                                ) {
                                    this.getParent()._doPrefetchDataPost();
                                }
                                return resolve();
                            });
                        })
                        .catch(err => {
                            console.log(
                                `[ServiceWorker] Init configuration was failed. The worker its in inconsisten state!`
                            );
                            console.log(err);
                        });
                    break;

                // Received to send pwa config. to the user page.
                case "GET_PWA_CONFIG":
                    this.sendToPages().catch(() => {
                        console.log(
                            `[ServiceWorker] Error sending pwa configuration to the user page!`
                        );
                    });
                    break;
            }
        },
    });

    return SWConfigManager;
});
