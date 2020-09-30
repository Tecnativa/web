// Copyright 2020 Tecnativa - Alexandre Díaz
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
odoo.define('web_pwa_json.FormMobileController', function (require) {
    "use strict";

    var FormController = require('web.FormController');


    var FormMobileController = FormController.extend({
        createRecord: function (parentID) {
            var self = this;
            var record = this.model.get(this.handle, {raw: true});
            return this.model.load({
                context: record.getContext(),
                fields: record.fields,
                fieldsInfo: record.fieldsInfo,
                modelName: this.modelName,
                parentID: parentID,
                res_ids: record.res_ids,
                type: 'record',
                viewType: 'formMobile',
            }).then(function (handle) {
                self.handle = handle;
                self._updateEnv();
                return self._setMode('edit');
            });
        },
    });

    return FormMobileController;

});
