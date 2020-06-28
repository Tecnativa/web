/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

var PWA = OdooClass.extend({

    /**
     * @param {String} cache_name
     * @param {Array[String]} prefetched_urls
     */
    init: function (cache_name, prefetched_urls) {
        this._cache_name = cache_name;
        this._prefetched_urls = prefetched_urls;
        this._cache = caches;
    },

    /**
     * @returns {Promise}
     */
    installWorker: function () {
        return new Promise(async resolve => {
            await this._initCaches();
            await this._prefetchData();
            resolve();
        });
    },

    /**
     * @returns {Promise}
     */
    activateWorker: function () {
        return new Promise(async resolve => {
            await this._initCaches();
            await this._cleanCaches();
            resolve();
        });
    },

    /**
     * @returns {Promise[Response]}
     */
    processRequest: function (request) {
        if (request.method === 'GET' && (request.cache !== 'only-if-cached' || request.mode === 'same-origin')) {
            // Strategy: Cache First
            return this._cache.match(request).then(function(response){
                return response || fetch(request);
            });
        }
        // Default browser behaviour
        return fetch(request);
    },

    /**
     * @returns {Promise}
     */
    _initCaches: function() {
        return caches.open(this._cache_name).then(cache => this._cache = cache);
    },

    /**
     * @returns {Promise}
     */
    _cleanCaches: function() {
        return caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== this._cache_name) {
                    console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        });
    },

    /**
     * @returns {Promise}
     */
    _prefetchData: function() {
        // Prefetch URL's
        return this._cache.addAll(this._prefetched_urls);
    },

});
