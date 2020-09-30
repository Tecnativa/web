// Copyright 2020 Tecnativa - Alexandre Díaz
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
odoo.define("web_pwa_json.FormView", function (require) {
    "use strict";

    var FormView = require("web.FormView");
    var FormMobileRenderer = require("web_pwa_json.FormMobileRenderer");
    var FormMobileController = require("web_pwa_json.FormMobileController");
    var ViewRegistry = require("web.view_registry");
    var core = require("web.core");

    var _lt = core._lt;

    var FormMobileView = FormView.extend({
        config: _.extend({}, FormView.prototype.config, {
            Renderer: FormMobileRenderer,
            Controller: FormMobileController,
        }),
        viewType: "formMobile",
        display_name: _lt("Form Mobile"),
        icon: "fa-mobile",
        mobile_friendly: true,
    });

    ViewRegistry.add("formMobile", FormMobileView);

    return FormMobileView;
});
