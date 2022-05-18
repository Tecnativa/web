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

    async _loadData(config, prune = true) {}
}
