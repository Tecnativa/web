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
        console.log("----------- INITIALIZE PWA!!");
        this._dbLoadPromise = this._db
            .initDatabase("webclient", this._onUpgradeWebClientDB)
            .then(() => {
                console.log("--------- DATABASE INITIALZIED!");
                return this._config.start().then(() => {
                    this._sendConfigToClient();
                    this._isLoaded = true;
                    return true;
                });
            });
    },

    // /**
    //  * @override
    //  */
    // installWorker: function () {
    //     console.log("---- PASA INSTALLL");
    //     this._dbLoadPromise = this._db.initDatabase(
    //         "webclient",
    //         this._onUpgradeWebClientDB
    //     );
    //     return Promise.all([
    //         this._dbLoadPromise,
    //         this._super.apply(this, arguments),
    //     ]).then(() => {
    //         console.log("--------- DATABASE INITIALZIED!");
    //         return this._config.start().then(() => {
    //             this._sendConfigToClient();
    //             this._isLoaded = true;
    //             return true;
    //         });
    //     });
    // },

    // /**
    //  * @override
    //  */
    // activateWorker: function () {
    //     console.log("---- PASA INSTALLL");
    //     this._dbLoadPromise = this._db.initDatabase(
    //         "webclient",
    //         this._onUpgradeWebClientDB
    //     );
    //     return Promise.all([
    //         this._dbLoadPromise,
    //         this._super.apply(this, arguments),
    //     ]).then(() => {
    //         console.log("--------- DATABASE INITIALZIED!");
    //         return this._config.start().then(() => {
    //             this._sendConfigToClient();
    //             this._isLoaded = true;
    //             return true;
    //         });
    //     });
    // },

    /**
     * @override
     */
    processRequest: function (request) {
        // Only process 'application/json'
        // Strategy: Cache + Try Background Network Request
        console.log("----- PROCES CACHE");
        console.log(this._config.isOfflineMode());
        if (
            this._config.isOfflineMode() &&
            request.method === "POST" &&
            request.headers.get("Content-Type") === "application/json"
        ) {
            return new Promise(async (resolve, reject) => {
                const request_cloned_net = request.clone();
                const request_cloned_cache = request.clone();
                // Tries to process the request over the network in the background
                // try {
                //     fetch(request).then(async (response_net) => {
                //         request_cloned_net
                //             .json()
                //             .then((data) => this._processResponse(response_net, data));
                //         return true;
                //     });
                // } catch (err) {
                //     // do nothing.
                // }
                try {
                    const response_cache = await this._tryFromCache(
                        request_cloned_cache
                    );
                    console.log("------------- TRY FROM CACHE!!!");
                    console.log(response_cache);
                    if (response_cache) {
                        return resolve(response_cache);
                    }
                } catch (err) {
                    console.log(
                        "[ServiceWorker] The request can't be processed: Cached content not found! Fallback to default browser behaviour..."
                    );
                    console.log(err);
                }

                return reject();
            });
        }
        return this._super.apply(this, arguments);
    },

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
     * @returns {Promise[Response]}
     */
    _tryFromCache: function (request_cloned) {
        return new Promise(async (resolve, reject) => {
            const request_data = await request_cloned.json();
            const url = new URL(request_cloned.url);
            console.log("MIRIADNO..");
            console.log(url.pathname);
            for (let [key, fnct] of Object.entries(this._routes.out)) {
                if (url.pathname.startsWith(key)) {
                    console.log("----- ENCUENTRA!!");
                    console.log(`${url.pathname} ---- ${key}`);
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

    _processResponse: function (response, request_data) {
        console.log("[ServiceWorker] Processing Response...");
        if (!response) {
            return false;
        }
        const response_cloned = response.clone();
        return new Promise(async (resolve) => {
            const response_data = await response_cloned.json();
            console.log(response_data);
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

    _sendConfigToClient: function () {
        console.log("---- CONFIG CLIENT");
        console.log(this._config.state);
        this.postClientPageMessage({
            type: "PWA_INIT_CONFIG",
            data: this._config.state,
        });
        this._updateSyncCount();
        return Promise.resolve();
    },

    _sendSyncRecordsToClient: function () {
        return this._sync.getSyncRecords().then((records) => {
            this.postClientPageMessage({
                type: "PWA_SYNC_RECORDS",
                records: records,
            });
        });
    },

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

    _updateSyncCount: function () {
        this._sync.getSyncRecords().then((records) => {
            this.postClientPageMessage({
                type: "PWA_SYNC_RECORDS_COUNT",
                count: records.length,
            })
        });
    },
});
