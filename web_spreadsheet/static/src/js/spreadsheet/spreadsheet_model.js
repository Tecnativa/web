/** @odoo-module **/

import {Model} from "@web/views/helpers/model";
import {KeepLast, Race} from "@web/core/utils/concurrency";

export class SpreadsheetModel extends Model {
    setup(params) {
        // concurrency management
        this.keepLast = new KeepLast();
        this.race = new Race();
        const _loadData = this._loadData.bind(this);
        this._loadData = (...args) => {
            return this.race.add(_loadData(...args));
        };
    }

    async saveSpreadSheet(data, sheet) {
        const sheet_rows = sheet.rows;
        const record = this._getRecordData(sheet_rows);
        const save_prom = this.keepLast.add(this.orm.create("spreadsheet", record));
        try {
            await save_prom;
        } catch (err) {
            console.error("Something bad was happend");
        }
    }

    _getRecordData(rows) {
        return {
            name: "This is a test",
            data: JSON.stringify(rows),
        }
    }

    async _loadData(config, prune = true) {}
}
