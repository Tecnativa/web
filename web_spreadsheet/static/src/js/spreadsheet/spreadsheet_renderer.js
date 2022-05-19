/** @odoo-module **/

import { _lt } from "@web/core/l10n/translation";
const {Component} = owl;
const bus = new owl.core.EventBus();


export class SpreadsheetRenderer extends Component {
    spreadsheet = null

    setup() {
        this.env.bus.on("spreadsheet-load-data", this, this._onLoadData);
        this._lazySave = _.debounce(this._onChangeSpreadsheet.bind(this), 250);
    }

    mounted() {
        this.spreadsheet = x_spreadsheet("#xspreadsheet", {
            showToolbar: true,
            showGrid: true,
            showBottomBar: true,
            view: {
                height: () => $("#xspreadsheet").height(),
                width: () => document.documentElement.clientWidth,
            },
        });
    }

    _onChangeSpreadsheet() {
        const data = this.spreadsheet.getData();
        this.props.model.saveSpreadSheet(data);
    }

    _onLoadData(evt) {
        this.spreadsheet.loadData(evt.data).change(this._lazySave);
    }
}


SpreadsheetRenderer.template = "web_spreadsheet.SpreadsheetRenderer";
