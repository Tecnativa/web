/** @odoo-module **/

import { _lt } from "@web/core/l10n/translation";
import {Model} from "@web/views/helpers/model";
import {KeepLast, Race} from "@web/core/utils/concurrency";


export class SpreadsheetModel extends Model {
    setup(params) {
        // concurrency management
        this.keepLast = new KeepLast();
        this.race = new Race();
        this.metaData = params.metaData;
        const _loadData = this._loadData.bind(this);
        this._loadData = (...args) => {
            return this.race.add(_loadData(...args));
        };
        this._loadData();
    }

    async saveSpreadSheet(data) {
        const record = this._getRecordData(data);
        let save_prom = Promise.resolve();
        if (this.metaData.resID) {
            save_prom = this.keepLast.add(this.orm.write("spreadsheet", [this.metaData.resID], record));
        } else {
            record.name = _lt("Unnamed Spreadsheet")
            save_prom = this.keepLast.add(this.orm.create("spreadsheet", record));
        }
        try {
            await save_prom;
        } catch (err) {
            console.error(err);
        }
    }

    _getRecordData(data) {
        return {
            data: JSON.stringify(data),
        }
    }

    async _loadData() {
        const load_prom = this.keepLast.add(this.orm.read("spreadsheet", [this.metaData.resID], ['data']));
        this.records = [];
        try {
            const res = await load_prom;
            this.record = JSON.parse(res[0].data);
            this.env.bus.trigger("spreadsheet-load-data", { data: this.record});
        } catch (err) {
            // TODO
        }
    }
}
