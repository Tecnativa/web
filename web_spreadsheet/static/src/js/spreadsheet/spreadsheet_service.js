/** @odoo-module **/

import { registry } from "@web/core/registry";
import { sprintf } from "@web/core/utils/strings";
import spreadsheet from "@documents_spreadsheet/js/o_spreadsheet/o_spreadsheet_loader";
import { buildViewLink } from "@documents_spreadsheet/js/o_spreadsheet/registries/odoo_menu_link_cell";
import { createEmptySpreadsheet } from "@documents_spreadsheet/js/o_spreadsheet/helpers/helpers";
import { UNTITLED_SPREADSHEET_NAME } from "../../constants";

const { markdownLink, createEmptyWorkbookData } = spreadsheet.helpers;

/**
 * Helper to get the function to be called when the spreadsheet is opened
 * in order to insert the link.
 * @param {boolean} isEmptySpreadsheet True if the link is inserted in
 *                                     an empty spreadsheet, false
 *                                     otherwise
 * @param {ViewLinkDescription} actionToLink
 * @returns Function to call
 */
function getInsertMenuCallback(isEmptySpreadsheet, actionToLink) {
    return (model) => {
        if (!isEmptySpreadsheet) {
            const sheetId = model.uuidGenerator.uuidv4();
            const sheetIdFrom = model.getters.getActiveSheetId();
            model.dispatch("CREATE_SHEET", {
                sheetId,
                position: model.getters.getVisibleSheets().length,
            });
            model.dispatch("ACTIVATE_SHEET", { sheetIdFrom, sheetIdTo: sheetId });
        }
    };
}

/**
 * This class is an interface used to interact with
 * the server database to manipulate spreadsheet documents.
 * It hides details of the underlying "documents.document" model.
 */
class SpreadsheetService {
    /**
     * @param {OdooEnv} env
     * @param {Object} dependencies injected services
     */
    constructor(env, { orm, notification, action }) {
        this.env = env;
        this.orm = orm;
        this.action = action;
        this.notification = notification;
    }

    /**
     * Create a new spreadsheet document where every value
     * is copied from the existing document `documentId`,
     * except for the exported data and the thumbnail.
     * @param {number} documentId document to copy
     * @param {Object} values
     * @param {Object} values.data exported spreadsheet data
     * @param {string} values.thumbnail spreadsheet thumbnail
     * @returns {number} id of the newly created spreadsheet document
     */
    async copy(documentId, { data, thumbnail }) {
        const defaultValues = {
            mimetype: "application/o-spreadsheet",
            raw: JSON.stringify(data),
            spreadsheet_snapshot: false,
            thumbnail,
        };
        return this.orm.call("documents.document", "copy", [documentId], {
            default: defaultValues,
        });
    }

    /**
     * Create a new empty spreadsheet document
     * @returns {number} id of the newly created spreadsheet document
     */
    async createEmpty() {
        const data = {
            name: UNTITLED_SPREADSHEET_NAME,
            mimetype: "application/o-spreadsheet",
            raw: JSON.stringify(createEmptyWorkbookData(`${this.env._t("Sheet")}1`)),
            handler: "spreadsheet",
        };
        return this.orm.create("documents.document", data);
    }

    /**
     * Save the data and thumbnail on the given document
     * @param {number} documentId
     * @param {Object} values values to save
     * @param {Object} values.data exported spreadsheet data
     * @param {string} values.thumbnail spreadsheet thumbnail
     */
    async save(documentId, { data, thumbnail }) {
        await this.orm.write("documents.document", [documentId], {
            thumbnail,
            raw: JSON.stringify(data),
            mimetype: "application/o-spreadsheet",
        });
    }

    /**
     * Save a new name for the given document
     * @param {number} documentId
     * @param {string} name
     */
    async saveName(documentId, name) {
        await this.orm.write("documents.document", [documentId], { name });
    }

    /**
     * Fetch all the necessary data to join a collaborative spreadsheet
     * @param {number} documentId
     * @returns {Object}
     */
    async fetchData(documentId) {
        return this.orm.call("documents.document", "join_spreadsheet_session", [documentId]);
    }

    /**
     * Open a new spreadsheet or an existing one and insert a link to the action.
     * @param {Object} spreadsheet
     *  a spreadsheet that has been returned by get_spreadsheets_to_display
     * @param {ViewLinkDescription} actionToLink
     */
    async insertInSpreadsheet(spreadsheet, actionToLink) {
        let documentId;
        let notificationMessage;
        if (!spreadsheet) {
            documentId = await createEmptySpreadsheet(this.orm);
            notificationMessage = this.env._t("New spreadsheet created in Documents");
        } else {
            documentId = spreadsheet.id;
            notificationMessage = sprintf(
                this.env._t("New sheet inserted in '%s'"),
                spreadsheet.name
            );
        }
        this.notification.add(notificationMessage, { type: "info" });
        this.action.doAction({
            type: "ir.actions.client",
            tag: "action_open_spreadsheet",
            params: {
                spreadsheet_id: documentId,
                initCallback: getInsertMenuCallback(!spreadsheet, actionToLink),
            },
        });
    }
}

/**
 * This service exposes a single instance of the above class.
 */
export const spreadsheetService = {
    dependencies: ["orm", "notification", "action"],
    start(env, dependencies) {
        return new SpreadsheetService(env, dependencies);
    },
};

registry.category("services").add("spreadsheet", spreadsheetService);
