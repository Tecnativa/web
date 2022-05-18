/** @odoo-module **/

import { _lt } from "@web/core/l10n/translation";
import SpreadsheetComponent from "documents_spreadsheet.SpreadsheetComponent";
import SpreadsheetCollaborativeChannel from "../../js/collaborative/spreadsheet_collaborative_channel"
import { SpreadsheetControlPanel } from "../control_panel/spreadsheet_control_panel";
import { SpreadsheetName } from "../control_panel/spreadsheet_name";

import { download } from "@web/core/network/download";
import { useService } from "@web/core/utils/hooks";
import { registry } from "@web/core/registry";
import { AbstractSpreadsheetAction } from "./abstract_spreadsheet_action";
const { useState, useRef } = owl.hooks;

export class SpreadsheetAction extends AbstractSpreadsheetAction {
    setup() {
        super.setup();
        this.orm = useService("orm");
        this.service = useService("spreadsheet");
        this.actionService = useService("action");
        this.spreadsheetRef = useRef("spreadsheet");
        this.state = useState({
            numberOfConnectedUsers: 1,
            isSynced: true,
            isFavorited: false,
            spreadsheetName: UNTITLED_SPREADSHEET_NAME,
        });
    }

    /**
     * @override
     */
    _loadData(record) {
        this.state.isFavorited = record.is_favorited;
        this.spreadsheetData = JSON.parse(record.raw);
        this.stateUpdateMessages = record.revisions;
        this.snapshotRequested = record.snapshot_requested;
        this.state.spreadsheetName = record.name;
        this.isReadonly = record.isReadonly;
    }

    /**
     * @private
     * @param {OdooEvent} ev
     */
    async _onDownload(ev) {
        await download({
            url: "/documents/xlsx",
            data: {
                zip_name: `${ev.detail.name}.xlsx`,
                files: JSON.stringify(ev.detail.files),
            },
        });
    }

    /**
     * @param {OdooEvent} ev
     * @returns {Promise}
     */
    _onSpreadSheetFavoriteToggled(ev) {
        this.state.isFavorited = !this.state.isFavorited
        return this.orm.call("documents.document", "toggle_favorited", [[this.resId]]);
    }

    /**
     * Updates the control panel with the sync status of spreadsheet
     *
     * @param {OdooEvent} ev
     */
    _onSpreadsheetSyncStatus(ev) {
        this.state.isSynced = ev.detail.synced;
        this.state.numberOfConnectedUsers = ev.detail.numberOfConnectedUsers;
    }
    /**
     * Reload the spreadsheet if an unexpected revision id is triggered.
     */
    _onUnexpectedRevisionId() {
        this.actionService.doAction("reload_context");
    }
}
SpreadsheetAction.template = "documents_spreadsheet.SpreadsheetAction";
SpreadsheetAction.components = { SpreadsheetComponent, SpreadsheetControlPanel, SpreadsheetName };

registry.category("actions").add("action_open_spreadsheet", SpreadsheetAction);
