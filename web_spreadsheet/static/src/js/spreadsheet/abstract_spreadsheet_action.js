/** @odoo-module **/

import { _lt } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";

const { useState } = owl.hooks;

export class AbstractSpreadsheetAction extends owl.Component {
    setup() {
        debugger;
        const params = this.props.action.params;
        this.resId = params.spreadsheet_id || params.active_id; // backward compatibility. spreadsheet_id used to be active_id
        this.router = useService("router");
        this.actionService = useService("action");
        this.notifications = useService("notification");
        this.state = useState({
            spreadsheetName: _lt("Untitled Spreadsheet")
        });
        /**
         * this.props.state is only present if we come from the breadcrumb.
         * In that case, we do not want to execute the callback
         */
        this.initCallback = this.props.state ? undefined : this.props.action.params.initCallback;
    }

    async willStart() {
        const record = await this.service.fetchData(this.resId);
        this._loadData(record);
        await assets;
    }

    mounted() {
        this.router.pushState({ spreadsheet_id: this.resId });
        this.trigger("controller-title-updated", this.state.spreadsheetName);
    }

    /**
     * Create a copy of the given spreadsheet and display it
     */
    async _onMakeCopy(ev) {
        const id = await this.service.copy(this.resId, ev.detail);
        this._openSpreadsheet(id);
    }

    /**
     * Create a new sheet and display it
     */
    async _onNewSpreadsheet() {
        const id = await this.service.createEmpty();
        this._openSpreadsheet(id);
    }

    async _onSpreadsheetSaved(ev) {
        const { data, thumbnail } = ev.detail;
        this.service.save(this.resId, { data, thumbnail });
    }

    /**
     * Saves the spreadsheet name change.
     * @param {OdooEvent} ev
     * @returns {Promise}
     */
    _onSpreadSheetNameChanged(ev) {
        const { name } = ev.detail;
        this.state.spreadsheetName = name;
        this.trigger("controller-title-updated", this.state.spreadsheetName);
        return this.service.saveName(this.resId, name);
    }

    /**
     * Open a spreadsheet
     * @private
     */
    _openSpreadsheet(spreadsheet_id) {
        this.notifications.add(this.notificationMessage, {
            type: "info",
            sticky: false,
        });
        this.actionService.doAction(
            {
                type: "ir.actions.client",
                tag: this.props.action.tag,
                params: { spreadsheet_id },
            },
            { clear_breadcrumbs: true }
        );
    }
}
