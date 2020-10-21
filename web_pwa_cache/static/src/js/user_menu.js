odoo.define("web_pwa_cache.UserMenu", function (require) {
    "use strict";

    var UserMenu = require("web.UserMenu");
    var WebClient = require("web.WebClient");
    var web_client = require('web.web_client');
    var BroadcastSWMixin = require("web_pwa_cache.BroadcastSWMixin");
    require("web_pwa_cache.PWAManager");

    UserMenu.include(BroadcastSWMixin);
    UserMenu.include({
        /**
         * @override
         * @returns {Deferred}
         */
        start: function () {
            var wc = this.findAncestor(function (ancestor) {
                return ancestor instanceof WebClient;
            });
            this._pwaManager = wc.pwa_manager;
            this.postServiceWorkerMessage({type: 'GET_PWA_CONFIG'});
            return this._super.apply(this, arguments);
        },

        _updatePWACheckbox: function (pwa_mode) {
            console.log("------ USER MENU SET CEHCKBOSs");
            console.log(this.$("[data-menu='pwaMode'] input"));
            this.$("[data-menu='pwaMode'] input").prop('checked', pwa_mode === 'offline');
        },

        _updatePWASyncRecordsCount: function (count) {
            this.$("[data-menu='pwaQueueSync'] #records_count").text(count);
        },

        /**
         * @private
         */
        _onMenuPwaMode: function () {
            const is_checked = this.$("[data-menu='pwaMode'] input").prop('checked');
            this._setPWAMode(is_checked ? 'online' : 'offline');
        },

        _onMenuPwaQueueSync: function () {
            this.postServiceWorkerMessage({type: 'GET_PWA_SYNC_RECORDS'});
        },

        _onReceiveServiceWorkerMessage: function(evt) {
            this._super.apply(this, arguments);
            switch (evt.data.type) {
                case "PWA_CONFIG_CHANGED":
                case "PWA_INIT_CONFIG": {
                    if (evt.data.data.pwa_mode) {
                        this._updatePWACheckbox(evt.data.data.pwa_mode);
                    }
                } break;
                case "PWA_SYNC_RECORDS_COUNT": {
                    this._updatePWASyncRecordsCount(evt.data.count);
                }
            };
        },

        _setPWAMode: function(mode) {
            this._pwaManager.setPWAMode(mode);
        },
    });
});
