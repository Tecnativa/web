/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

PWA.include({
    /**
     * @override
     */
    init: function () {
        this._isLoaded = false;
        this._super.apply(this, arguments);
        this._rpc = new OdooRPC();
        this._db = new DatabaseManager();
        this._importer = new Importer(this._db);
        this._exporter = new Exporter(this._db);
        this._config = new Config(this._db);
        this._sync = new Sync(this._db);
        this._dbLoadPromise = this._db
            .initDatabase("webclient", this._onUpgradeWebClientDB)
            .then(() => {
                return this._config.start().then(() => {
                    this._sendConfigToClient();
                    this._isLoaded = true;
                    return true;
                });
            });
    },

    /**
     * Intercepts 'POST' request.
     * If doesn't run the PWA in standalone mode all request goes
     * through network and will be cached.
     * If run in standalone mode:
     *  - online:
     *      If is a CUD operation goes through network, if fails tries from cache.
     *      Other requests goes through cache directly, if fails tries network.
     *  - offline: Tries cache
     * @override
     */
    processRequest: function (request) {
        // Only process 'application/json'
        if (
            request.method === "POST" &&
            request.headers.get("Content-Type") === "application/json"
        ) {
            return new Promise(async (resolve, reject) => {
                const request_cloned_cache = request.clone();

                let need_try_network = true;
                if (this._config.isStandaloneMode()) {
                    // Try CUD operations
                    // Methodology: Network first
                    if (!this._config.isOfflineMode()) {
                        const crud_oper = this._getCRUDOperation(request_cloned_cache);
                        if (['create', 'unlink', 'write'].indexOf(crud_oper) !== -1) {
                            need_try_network = false;
                            const request_cloned_net = request.clone();
                            const response_net = await this._tryFromNetwork(request_cloned_net);
                            if (response_net) {
                                return resolve(response_net);
                            }
                        }
                    }

                    // Other request (or network fails) go directly from cache
                    try {
                        const response_cache = await this._tryFromCache(
                            request_cloned_cache
                        );
                        if (response_cache) {
                            return resolve(response_cache);
                        }
                    } catch (err) {
                        console.log(
                            "[ServiceWorker] The request can't be processed: Cached content not found! Fallback to default browser behaviour..."
                        );
                        console.log(err);
                        this.postClientPageMessage({
                            type: "PWA_CACHE_FAIL",
                            error: err,
                            url: request_cloned_cache.url.pathname,
                        });
                    }

                    if (need_try_network) {
                        const request_cloned_net = request.clone();
                        const response_net = await this._tryFromNetwork(request_cloned_net);
                        return resolve(response_net);
                    }
                }
                // else {
                //     // No standalone mode, so go throught network and cache the response
                //     const request_cloned_net = request.clone();
                //     const request_data = await request_cloned_net.json();
                //     const response_net = await fetch(request);
                //     this._processResponse(response_net, request_data);
                //     return resolve(response_net);
                // }

                return reject();
            });
        }
        return this._super.apply(this, arguments);
    },

    /**
     * Try obtain the CRUD operation of the request
     *
     * @param {FetchRequest} request_cloned
     * @returns {String}
     */
    _getCRUDOperation: function (request_cloned) {
        const url = new URL(request_cloned.url);
        if (url.pathname.startsWith('/web/dataset/call_kw') || url.pathname.startsWith('/web/dataset/call')) {
            const pathname_parts = url.pathname.split("/");
            const method_name = pathname_parts[5];
            return method_name;
        }
        return "";
    },

    /**
     * Creates the schema of the used database:
     *  - views: Store views
     *  - actions: Store actions
     *  - defaults: Store defaults model values
     *  - model: Store model records
     *  - sync: Store transactions to synchronize
     *  - config: Store PWA configurations values
     *  - functions: Store function calls results
     *  - post: Store post calls results
     *  - filters: Store filters
     *  - userdata: Store user data configuration values
     *  - onchange: Store onchange vales
     *
     * @param {IDBDatabaseEvent} evt
     */
    _onUpgradeWebClientDB: function (evt) {
        console.log("[ServiceWorker] Generating DB Schema...");
        const db = evt.target.result;
        if (evt.oldVersion < 1) {
            db.createObjectStore("views", {keyPath: "model"});
            db.createObjectStore("actions", {keyPath: "id"});
            db.createObjectStore("defaults", {keyPath: "model"});
            let objectStore = db.createObjectStore("records", {
                keyPath: ["model", "domain"],
            });
            objectStore.createIndex("model", "model", {unique: false});
            db.createObjectStore("sync", {autoIncrement: true});
            db.createObjectStore("config", {keyPath: "param", unique: true});
            db.createObjectStore("functions", {
                keyPath: ["model", "function", "params"],
                unique: true,
            });
            db.createObjectStore("post", {
                keyPath: ["pathname", "params"],
                unique: true,
            });
            db.createObjectStore("filters", {
                keyPath: "model",
                unique: true,
            });
            db.createObjectStore("userdata", {keyPath: "param", unique: true});
            db.createObjectStore("onchange", {
                keyPath: ["model", "field", "params"],
                unique: true,
            });
        }
    },

    /**
     * @param {Promise} request_cloned
     */
    _tryFromNetwork: function (request_cloned) {
        return new Promise(async (resolve, reject) => {
            const response_net = await fetch(request_cloned);
            if (response_net) {
                const request_data = await request_cloned.json();
                this._processResponse(response_net, request_data);
                return resolve(response_net);
            }
            return reject();
        });
    },

    /**
     * @returns {Promise[Response]}
     */
    _tryFromCache: function (request_cloned) {
        return new Promise(async (resolve, reject) => {
            const request_data = await request_cloned.json();
            const url = new URL(request_cloned.url);
            for (let [key, fnct] of Object.entries(this._routes.out)) {
                if (url.pathname.startsWith(key)) {
                    return resolve(this[fnct](url, request_data));
                }
            }
            // Generic Post Caching
            console.log("[ServiceWorker] Caching generic POST request")
            const cached_response = this._routeOutGenericPost(url, request_data);
            if (cached_response) {
                return resolve(cached_response);
            }
            return reject();
        });
    },

    /**
     * Process request response to cache the values
     *
     * @param {FetchResponse} response
     * @param {Object} request_data
     * @return {Promise}
     */
    _processResponse: function (response, request_data) {
        console.log("[ServiceWorker] Processing Response...");
        if (!response) {
            return false;
        }
        const response_cloned = response.clone();
        return new Promise(async (resolve) => {
            const response_data = await response_cloned.json();
            const url = new URL(response_cloned.url);
            for (let [key, fnct] of Object.entries(this._routes.in)) {
                if (url.pathname.startsWith(key)) {
                    await this[fnct](url, response_data, request_data);
                    break;
                }
            }
            return resolve();
        });
    },

    /**
     * Send configuration state to the client pages
     *
     * @returns {Promise}
     */
    _sendConfigToClient: function () {
        this.postClientPageMessage({
            type: "PWA_INIT_CONFIG",
            data: this._config.state,
        });
        this._updateSyncCount();
        return Promise.resolve();
    },

    /**
     * Send transactions to synchronize to the client pages
     * This will open a dialog to display the transactions.
     *
     * @returns {Promise}
     */
    _sendSyncRecordsToClient: function () {
        return this._sync.getSyncRecords().then((records) => {
            this.postClientPageMessage({
                type: "PWA_SYNC_RECORDS",
                records: records,
            });
        });
    },

    /**
     * Send transactions to synchronize to Odoo
     * If one fails, all the process will be aborted.
     *
     * @returns {Promise}
     */
    _startSync: function () {
        return new Promise(async (resolve, reject) => {
            const records = await this._sync.getSyncRecords();
            for (const index in records) {
                const record = records[index];
                let s_args = record.raw.args;
                // Remove generated client ids to be generated by server side
                if (record.raw.method === "create") {
                    s_args = _.map(record.raw.args, (item) => _.omit(item, "id"));
                }
                let response=false, request_data=false;
                try {
                    [response, request_data] = await this._rpc.callJSonRpc(record.raw.model, record.raw.method, s_args, record.raw.kwargs);
                } catch (err) {
                    console.log("[ServiceWorker] Error: can't synchronize the current record. Aborting!");
                    await this._sync.updateSyncRecord(index, {failed: true});
                    return reject(index);
                }
                const response_clone = response.clone();
                const data = await response_clone.json();
                const new_ids = typeof data.result === "number"?[data.result]:data.result;
                for (const index_b in new_ids) {
                    const new_id = new_ids[index_b];
                    const old_id = record.raw.args[index_b].id;
                    await this._sync._updateModelRecord(record.raw.model, old_id, {id: new_id});
                }
                await this._sync.removeSyncRecord(index);
            }
            this._updateSyncCount();
            return resolve();
        });
    },

    /**
     * This will update the counter of transactions to synchronize on the
     * client pages.
     *
     * @returns {Promise}
     */
    _updateSyncCount: function () {
        this._sync.getSyncRecords().then((records) => {
            this.postClientPageMessage({
                type: "PWA_SYNC_RECORDS_COUNT",
                count: records.length,
            })
        });
    },
});
