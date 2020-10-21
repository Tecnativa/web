odoo.define("web_pwa_cache.PWASyncModal", function (require) {
    "use strict";

    var core = require('web.core');
    var Dialog = require('web.Dialog');
    var Widget = require("web.Widget");

    var QWeb = core.qweb;
    var _t = core._t;

    var PWASyncModal = Widget.extend({
        /**
         * @override
         */
        init: function(records, options) {
            this._super.apply(this, arguments);
            this.records = records;
            this.options = options;
        },

        show: function() {
            var self = this;
            var $content = $(QWeb.render("web_pwa_cache.PWASyncModal", {
                records: this.records,
            }));
            const buttons = [{
                text: _t("Close"),
                close: true,
            }];
            if (this.records.length) {
                buttons.unshift({
                    text: _t("Synchronize Now"),
                    classes : "btn-primary",
                    click: function () {
                        if (self.options.sync) {
                            self.options.sync.call();
                        }
                    },
                    close: true,
                });
            }
            this.dialog = new Dialog(this, {
                title: _t('PWA Records To Synchronize'),
                $content: $content,
                buttons: buttons,
                fullscreen: true,
            });
            this.dialog.open();
        },

        close: function () {
            this.dialog.close();
        },
    });

    return PWASyncModal;
});
