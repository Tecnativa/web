odoo.define("web_pwa_cache.ActionManager", function (require) {
    "use strict";

    var config = require("web.config");
    var ActionManager = require("web.ActionManager");
    require("web.ActWindowActionManager");

    /**
     * Here we try to force use 'formMobile' instead of 'form' in mobiles devices.
     * Thanks to this we don't need define the new view in the actions.
     */
    ActionManager.include({
        /**
         * This is called when open the view the first time.
         *
         * @override
         */
        doAction: function (action, options) {
            if (config.device.isMobile && options.viewType === "form") {
                options.viewType = "formMobile";
                var view_modes = action.view_mode.split(',');
                view_modes.splice(0, 0, "formMobile");
                action.view_mode = view_modes.join(',');
            }
            return this._super(action, options);
        },

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
                var formMobileView = _.findWhere(action.views, {
                    type: "formMobile",
                });
                if (formMobileView) {
                    //controller.viewType = "formMobile";
                    ev.data.view_type = formMobileView.fieldsView.type;
                }
            }
            this._super(ev);
        },

        /**
         * @override
         */
        loadState: function (state) {
            if (config.device.isMobile && state.view_type === "form") {
                state.view_type = "formMobile";
            }
            return this._super(state);
        },

        _handleAction: function (action, options) {
            if (config.device.isMobile && options.viewType === "form") {
                options.viewType = "formMobile";
                var view_modes = action.view_mode.split(',');
                view_modes.splice(0, 0, "formMobile");
                action.view_mode = view_modes.join(',');
            }
            return this._super(action, options);
        },

        _executeWindowAction: function (action, options) {
            if (config.device.isMobile && options.viewType === "form") {
                options.viewType = "formMobile";
                var view_modes = action.view_mode.split(',');
                view_modes.splice(0, 0, "formMobile");
                action.view_mode = view_modes.join(',');
            }
            return this._super(action, options);
        },
    });
});
