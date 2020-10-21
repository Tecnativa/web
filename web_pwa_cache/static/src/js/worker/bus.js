/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */
"use strict";

/**
 * This class is used to communicate with the user page.
 */
PWA.include({
    /**
     * @override
     */
    init: function () {
        this._super.apply(this, arguments);
        this._channel_out = new BroadcastChannel("sw-messages");
        this._channel_in = new BroadcastChannel("cl-messages");
        this._channel_in.addEventListener(
            "message",
            this._onReceiveClientMessage.bind(this)
        );
    },

    /**
     * @param {Object} message
     */
    postClientPageMessage: function (message) {
        this._channel_out.postMessage(message);
    },

    /**
     * @param {BroadcastChannelEvent} evt
     */
    _onReceiveClientMessage: function (evt) {
        if (!evt.isTrusted) {
            return;
        }
        switch (evt.data.type) {
            case "SET_PWA_MODE": {
                this._config.set("pwa_mode", evt.data.mode).then(() => {
                    this.postClientPageMessage({
                        type: "PWA_CONFIG_CHANGED",
                        data: {
                            pwa_mode: evt.data.mode,
                        },
                    });
                });
                if (evt.data.mode === "online") {
                    this._prefetchDataPost();
                }
            } break;
            case "PWA_PREFETCH_NEED_ACTION_NO": {
                this._send
            } break;
            case "GET_PWA_CONFIG": {
                this._sendConfigToClient();
            } break;
            case "GET_PWA_SYNC_RECORDS": {
                this._sendSyncRecordsToClient();
            } break;
            case "START_SYNCHRONIZATION": {
                this._startSync().then(() => this._prefetchDataPost());
            } break;
            case "START_PREFETCH": {
                this._prefetchDataPost();
            } break;
            case "SET_PWA_STANDALONE_MODE": {
                this._config.set("standalone", evt.data.status)
            }
        };
    },
});
