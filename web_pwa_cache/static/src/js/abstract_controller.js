odoo.define("web_pwa_cache.AbstractController", function (require) {
    "use strict";

    var config = require("web.config");
    var AbstractController = require("web.AbstractController");

    /**
     * Here we try to force use 'formMobile' instead of 'form' in mobiles devices.
     * Thanks to this we don't need define the new view in the actions.
     */
    AbstractController.include({
        init: function () {
            this._super.apply(this, arguments);
            if (this.initialState.viewType === 'form' && config.device.isMobile) {
                this.initialState.viewType = "formMobile";
            }
            console.log("--- INI ABS CONTROL");
            console.log(this.initialState);
        }
    });
});
