odoo.define("web_pwa_cache.AbstractWebClient", function (require) {
    "use strict";

    var config = require("web.config");
    var AbstractWebClient = require("web.AbstractWebClient");

    /**
     * Here we try to force use 'formMobile' instead of 'form' in mobiles devices.
     * Thanks to this we don't need define the new view in the actions.
     */
    AbstractWebClient.include({
        do_push_state: function (state) {
            console.log("----- PASAA");
            console.log(state);
            if (state.view_type === "form" && config.device.isMobile) {
                state.view_type = "formMobile";
            }
            this._super(state);
        }
    });
});
