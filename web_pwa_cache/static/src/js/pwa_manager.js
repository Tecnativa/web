/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */

odoo.define("web_pwa_cache.PWAManager", function (require) {
    "use strict";

    var core = require("web.core");
    var PWAManager = require("web_pwa_oca.PWAManager");
    var PWAModeSelector = require("web_pwa_cache.PWAModeSelector");
    var BroadcastSWMixin = require("web_pwa_cache.BroadcastSWMixin");
    var PWASyncModal = require("web_pwa_cache.PWASyncModal");

    var QWeb = core.qweb;
    var _t = core._t;

    PWAManager.include(BroadcastSWMixin);
    PWAManager.include({
        custom_events: {
            change_pwa_mode: "_onChangePWAMode",
        },
        _show_prefetch_modal_delay: 450,

        /**
         * @override
         */
        init: function () {
            this._super.apply(this, arguments);

            this._prefetchTasksInfo = {};
            this._prefetchModelHide = false;

            this.$modalPrefetchProgress = $(
                QWeb.render("web_pwa_cache.PrefetchProgress")
            );
            this.$modalPrefetchProgress.appendTo("body");
            this.$modalPrefetchProgressContent = this.$modalPrefetchProgress.find(
                ".modal-body"
            );
        },

        /**
         * @param {String} mode
         */
        setPWAMode: function (mode) {
            this._pwaMode = mode;
            this.postServiceWorkerMessage({
                type: "SET_PWA_MODE",
                mode: this._pwaMode,
            });
        },

        /**
         * Update progressbars of the prefetch dialog
         */
        _updatePrefetchModalData: function () {
            this.$modalPrefetchProgressContent.empty().append(
                QWeb.render("web_pwa_cache.PrefetchProgressTasks", {
                    tasks: _.values(this._prefetchTasksInfo),
                })
            );
        },

        /**
         * Receive service worker messages
         *
         * @param {BroadcastChannelEvent} evt
         */
        _onReceiveServiceWorkerMessage: function (evt) {
            this._super.apply(this, arguments);
            switch (evt.data.type) {
                /* General */
                case "PWA_INIT_CONFIG":
                    {
                        this._pwaMode = evt.data.data.pwa_mode;
                        if (this._isPWAStandalone()) {
                            var selector = new PWAModeSelector({
                                online: () => {
                                    this.setPWAMode("online");
                                    selector.close();
                                },
                                offline: () => {
                                    this.setPWAMode("offline");
                                    selector.close();
                                },
                            });
                            selector.show();
                        }
                        this.postServiceWorkerMessage({
                            type: "SET_PWA_STANDALONE_MODE",
                            status: this._isPWAStandalone(),
                        });
                    }
                    break;
                case "PWA_CONFIG_CHANGED":
                    {
                        if (evt.data.data.pwa_mode) {
                            this._pwaMode = evt.data.data.pwa_mode;
                        }
                    }
                    break;
                case "PWA_CACHE_FAIL":
                    {
                        this.call("notification", "notify", {
                            type: "warning",
                            title: _("PWA Cache Not Found!"),
                            message: _t(
                                "Can't found any cache to '" + evt.data.url + "'"
                            ),
                            sticky: false,
                            className: "",
                        });
                    }
                    break;
                /* Prefetching */
                case "PREFETCH_MODAL_TASK_INFO":
                    {
                        this._prefetchTasksInfo[evt.data.id] = {
                            message: evt.data.message,
                            progress: (evt.data.progress || 0) * 100,
                        };
                        this._updatePrefetchModalData();
                    }
                    break;
                case "PREFETCH_MODAL_SHOW":
                    {
                        // Timer to avoid show modal in fast operations
                        this._prefectModalOpenTimer = setTimeout(() => {
                            this._prefetchModelHide = false;
                            this.$modalPrefetchProgress.modal("show");
                            // This is necessary to hide the modal in fast conditions
                            // I think that can be removed on modern bootstrap versions
                            this.$modalPrefetchProgress.on("shown.bs.modal", () => {
                                if (this._prefetchModelHide) {
                                    this.$modalPrefetchProgress.modal("hide");
                                }
                            });
                            this._prefectModalOpenTimer = false;
                        }, this._show_prefetch_modal_delay);
                    }
                    break;
                case "PREFETCH_MODAL_HIDE":
                    {
                        this._prefetchModelHide = true;
                        this._prefetchTasksInfo = {};
                        if (this._prefectModalOpenTimer) {
                            clearTimeout(this._prefectModalOpenTimer);
                            this._prefectModalOpenTimer = false;
                        } else {
                            this.$modalPrefetchProgress.modal("hide");
                        }
                    }
                    break;
                /* Sync */
                case "PWA_SYNC_RECORDS":
                    {
                        const sync_modal = new PWASyncModal(evt.data.records, {
                            sync: this._onSyncNow.bind(this),
                        });
                        sync_modal.show();
                    }
                    break;
                case "PWA_SYNC_NEED_ACTION":
                    {
                        this.call("notification", "notify", {
                            type: "info",
                            title: _("Have transactions to synchronize"),
                            message:
                                "You have '" +
                                evt.data.count +
                                "' transactions to synchronize",
                            sticky: false,
                            className: "",
                        });

                        evt.data.records;
                    }
                    break;
            }
        },

        _onSyncNow: function () {
            this.postServiceWorkerMessage({
                type: "START_SYNCHRONIZATION",
            });
        },

        /**
         * @returns {Boolean}
         */
        _isPWAStandalone: function () {
            return (
                window.matchMedia("(display-mode: standalone)").matches ||
                window.navigator.standalone ||
                document.referrer.includes("android-app://")
            );
        },
    });
});
