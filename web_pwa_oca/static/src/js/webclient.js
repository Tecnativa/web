/* Copyright 2020 Tecnativa - Alexandre D. Díaz
 * License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */

// odoo.define("web_pwa_oca.webclient", function (require) {
//    "use strict";
//
//    var WebClient = require("web.WebClient");
//    var PWAManager = require("web_pwa_oca.PWAManager");
//
//    WebClient.include({
//        /**
//         * @override
//         */
//        show_application: function () {
//            this.pwa_manager = new PWAManager(this);
//            return this._super.apply(this, arguments);
//        },
//    });
// });

odoo.define("web_pwa_oca.pwa_launch", function (require) {
    "use strict";
    var core = require("web.core");
    var PWAManager = require("web_pwa_oca.PWAManager");

    core.bus.on("web_client_ready", null, function () {
        console.log("Load PWA Manager");
        this.pwa_manager = new PWAManager(this);
    });
});
