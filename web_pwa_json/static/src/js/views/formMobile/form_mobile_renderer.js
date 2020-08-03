// Copyright 2020 Tecnativa - Alexandre Díaz
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
odoo.define('web_pwa_json.FormMobileRenderer', function (require) {
    "use strict";

    var FormRenderer = require('web.FormRenderer');
    var config = require('web.config');


    var FormMobileRenderer = FormRenderer.extend({

        /**
         * Adds custom class to apply custom styles in mobile mode
         *
         * @override
         */
        start: function () {
            if (config.device.size_class <= config.device.SIZES.XS) {
                this.$el.addClass('o_xxs_form_mobile_view');
            }
            return this._super.apply(this, arguments);
        },

    });

    return FormMobileRenderer;
});
