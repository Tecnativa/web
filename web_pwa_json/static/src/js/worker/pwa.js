/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

PWA.include({

    /**
     * @override
     * @param {Array[String]} prefetched_models
     */
    init: function (cache_name, prefetched_urls, prefetched_models) {
        this._super.apply(this, arguments);
        this._prefetched_models = prefetched_models;
        this._rpc = new OdooRPC();
        this._db = new DatabaseManager();
        this._importer = new Importer(this._db);
        this._exporter = new Exporter(this._db);
        console.log("------------ PASPAPAPA");
        this._db.initDatabase("webclient", this._onUpgradeWebClientDB);
    },

    // /**
    //  * @override
    //  */
    // installWorker: function () {
    //     console.log("---- INSTLLL");
    //     return Promise.all([
    //         this._db.initDatabase("webclient", this._onUpgradeWebClientDB),
    //         this._super.apply(this, arguments),
    //     ]);

    // },

    // /**
    //  * @override
    //  */
    // activateWorker: function () {
    //     return Promise.all([
    //         this._db.initDatabase("webclient", this._onUpgradeWebClientDB),
    //         this._super.apply(this, arguments),
    //     ]);
    // },

    /**
     * @override
     */
    processRequest: function (request) {
        // Only process 'application/json'
        // Strategy: Network First
        if (request.method === 'POST' && request.headers.get('Content-Type') === 'application/json') {
            return new Promise(async resolve => {
                console.log("[ServiceWorker] Processing 'application/json' Request...");
                console.log(request.url);
                let response = false;
                const request_cloned = request.clone();
                try {
                    response = await fetch(request);
                    const data = await request_cloned.json();
                    console.log(data);
                    this._processResponse(response, data);
                } catch {
                    response = await this._tryFromCache(request_cloned);
                    if (response) {
                        const response_cloned = response.clone();
                        console.log("---- RESPONSE");
                        const data = await response_cloned.json();
                        console.log(data);
                        resolve(response);
                    }
                }

                resolve(response || ResponseJSONRPC({}));
            });
        }

        return this._super.apply(this, arguments);
    },

    /**
     * @override
     */
    _prefetchData: function() {
        console.log("------------ PREFEECTT");
        return Promise.all([
            new Promise(async resolve => {
                // Prefetch models records
                for (const model_name of this._prefetched_models) {
                    const [response, request_data] = await this._rpc.datasetJSonRpc('search_read', {
                        domain: [],
                        model: model_name,
                    });
                    this._processResponse(response, request_data);
                }
                // Get prefetching metadata
                let [response, resquest_data] = await this._rpc.sendJSonRpc('/pwa/prefetch/metadata');
                // Prefetch Actions
                const response_data = (await response.json()).result;
                console.log(response_data);
                for (const action_id of response_data[0]) {
                    const [response, request_data] = await this._rpc.sendJSonRpc('/web/action/load', {
                        action_id: action_id,
                    });
                    this._processResponse(response, request_data);
                }
                // Prefetch Views
                for (const view_ids of response_data[1]) {
                    let [response, request_data] = await this._rpc.callJSonRpc(view_ids[0], 'load_views', false, {
                        views: view_ids[1],
                    });
                    this._processResponse(response, request_data);

                    // Prefetch View Defaults
                    const response_clone = response.clone();
                    const data = await response_clone.json();
                    [response, request_data] = await this._rpc.callJSonRpc(view_ids[0], 'default_get', [data.result.fields]);
                    this._processResponse(response, request_data);
                }

                resolve();
            }),
            this._super.apply(this, arguments),
        ]);
    },

    _onUpgradeWebClientDB: function(evt) {
        console.log("[ServiceWorker] Generating DB Schema...");
        const db = evt.target.result;
        if (evt.oldVersion < 1) {
            db.createObjectStore('views', {keyPath: "model"});
            db.createObjectStore('actions', {keyPath: 'id'});
            db.createObjectStore('defaults', {keyPath: 'model'});
            let objectStore = db.createObjectStore('records', {keyPath: ['model', 'domain']});
            objectStore.createIndex("model", "model", { unique: false });
            db.createObjectStore('sync', {autoIncrement: true});
        }
    },

    /**
     * @returns {Promise[Response]}
     */
    _tryFromCache: function(request_cloned) {
        return new Promise(async (resolve, reject) => {
            const request_data = await request_cloned.json();
            const url = new URL(request_cloned.url);
            for (let [key, fnct] of Object.entries(this._routes.out)) {
                if (url.pathname.startsWith(key)) {
                    resolve(this[fnct](url, request_data));
                }
            }
            reject();
        });
    },

    _processResponse: function(response, request_data=false) {
        console.log("[ServiceWorker] Processing Response...");
        if (!response) {
            return false;
        }
        const response_cloned = response.clone();
        return new Promise(async resolve => {
            const response_data = await response_cloned.json();
            console.log(response_data);
            const url = new URL(response_cloned.url);
            const obj_keys = Object.keys(this._routes.in);
            for (let [key, fnct] of Object.entries(this._routes.in)) {
                if (url.pathname.startsWith(key)) {
                    this[fnct](url, response_data, request_data);
                    break;
                }
            }
            resolve();
        });
    },

});
