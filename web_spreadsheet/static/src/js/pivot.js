/** @odoo-module **/

import {PivotView} from "@web/views/pivot/pivot_view";
import {patch} from "@web/core/utils/patch";

patch(PivotView.prototype, "web_spreadsheet.pivot", {
    async onClickSpreadsheet() {
        this.actionService.doAction(
            {
                type: "ir.actions.act_window",
                name: "TEST",
                views: [[false, "spreadsheet"]],
                view_mode: "spreadsheet",
                res_model: "spreadsheet",
                // domain: domain,
            },
            {
                clear_breadcrumbs: true,
            }
        );
    },
});
