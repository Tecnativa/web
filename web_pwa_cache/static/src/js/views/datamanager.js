odoo.define("web_pwa_cache.DataManager", function (require) {
    "use strict";

    var config = require("web.config");
    var rpc = require("web.rpc");
    var DataManager = require("web.DataManager");

    /**
     * Here we try to force use 'formPWA' instead of 'form' in mobiles devices.
     * Thanks to this we don't need define the new view in the actions.
     */
    DataManager.include({
        load_action: function (action_id, additional_context) {
            var self = this;
            var key = this._gen_key(action_id, additional_context || {});

            if (!this._cache.actions[key]) {
                this._cache.actions[key] = rpc
                    .query({
                        route: "/web/action/load",
                        params: {
                            action_id: action_id,
                            additional_context: additional_context,
                        },
                    })
                    .then(function (action) {
                        self._cache.actions[key] = action.no_cache
                            ? null
                            : self._cache.actions[key];
                        if (config.device.isMobile && action.type === 'ir.actions.act_window' && _.findIndex(action.views, [false, "form"]) !== -1) {
                            action.view_mode += ",formPWA";
                            var index = _.findIndex(action.view, [false, "form"]);
                            action.views.splice(index, 0, [false, "formPWA"]);
                        }
                        return action;
                    }, this._invalidate.bind(this, this._cache.actions, key));
            }

            return this._cache.actions[key].then(function (action) {
                return $.extend(true, {}, action);
            });
        },
    });
});
