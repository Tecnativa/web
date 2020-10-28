odoo.define("web_pwa_cache.ActionManager", function (require) {
    "use strict";

    var config = require("web.config");
    var ActionManager = require("web.ActionManager");
    require("web.ActWindowActionManager");

    /**
     * Here we try to force use 'formPWA' instead of 'form' in mobiles devices.
     * Thanks to this we don't need define the new view in the actions.
     */
    ActionManager.include({
        /**
         * This is launched when switch the view
         * (for example click on a record in a tree view).
         *
         * @override
         */
        _onSwitchView: function (ev) {
            if (config.device.isMobile && ev.data.view_type === "form") {
                var controller = this.controllers[ev.data.controllerID];
                var action = this.actions[controller.actionID];
                var formPWAView = _.findWhere(action.views, {
                    type: "formPWA",
                });
                if (formPWAView) {
                    ev.data.view_type = formPWAView.fieldsView.type;
                }
            }
            this._super(ev);
        },
    });
});
