odoo.define("web_pwa_json.BasicView", function (require) {
    "use strict";

    var config = require("web.config");
    var BasicView = require("web.BasicView");

    /**
     * Here we try to force use 'formMobile' instead of 'form' in mobiles devices.
     * Thanks to this we don't need define the new view in the actions.
     */
    BasicView.include({
        /**
         * This is called when open the view the first time.
         *
         * @override
         */
        init: function (viewInfo, params) {
            this._super.apply(this, arguments);

            if (config.device.isMobile && this.viewType === "form") {
                console.log("----- PASA POR AKKIIII");
                this.viewType = "formMobile";
                this.fieldsInfo[this.viewType] = this.fieldsView.fieldsInfo[this.viewType];
                this.rendererParams.viewType = this.viewType;
                this.loadParams.viewType = this.viewType;
            }
        },
    });
});
