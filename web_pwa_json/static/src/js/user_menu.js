odoo.define("web_pwa_json.UserMenu", function (require) {
    "use strict";

    var UserMenu = require("web.UserMenu");

    UserMenu.include({
        /**
         * @override
         * @returns {Deferred}
         */
        start: function () {
            return this._super.apply(this, arguments);
        },

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         */
        _onMenuConnectivity: function () {
            var self = this;
            console.log("CLICKICKIC");
        },
    });
});
