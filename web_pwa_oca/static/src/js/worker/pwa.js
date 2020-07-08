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
        this._cache = new CacheManager();
    },

    /**
     * @returns {Promise}
     */
    installWorker: function () {
        return new Promise(async resolve => {
            await this._cache.initCache(this._cache_name);
            await this._prefetchData();
            resolve();
        });
    },

    /**
     * @returns {Promise}
     */
    activateWorker: function () {
        return new Promise(async resolve => {
            await this._cache.initCache(this._cache_name);
            await this._cache.clean();
            resolve();
        });
    },

    /**
     * @returns {Promise[Response]}
     */
    processRequest: function (request) {
        if (request.method === 'GET' && (request.cache !== 'only-if-cached' || request.mode === 'same-origin')) {
            // Strategy: Cache First
            return this._cache.get(this._cache_name).match(request).then(function(response){
                return response || fetch(request);
            });
        }
        // Default browser behaviour
        return fetch(request);
    },

    /**
     * @returns {Promise}
     */
    _prefetchData: function() {
        // Prefetch URL's
        return this._cache.get(this._cache_name).addAll(this._prefetched_urls);
    },

});
