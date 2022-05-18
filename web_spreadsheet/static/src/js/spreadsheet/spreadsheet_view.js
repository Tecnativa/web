//** @odoo-module **/
import {_lt} from "@web/core/l10n/translation";
import {registry} from "@web/core/registry";
import {SpreadsheetRenderer} from "@web_spreadsheet/js/spreadsheet/spreadsheet_renderer";
import {SpreadsheetModel} from "@web_spreadsheet/js/spreadsheet/spreadsheet_model";
import {Layout} from "@web/views/layout";
import {standardViewProps} from "@web/views/helpers/standard_view_props";
import {useModel} from "@web/views/helpers/model";

const viewRegistry = registry.category("views");

const {Component, hooks} = owl;
const {useSubEnv} = hooks;

export class SpreadsheetView extends Component {
    setup() {
        let searchModel = this.env.searchModel;
        searchModel.display = {
            controlPanel: false,
            searchPanel: false,
        };
        useSubEnv({searchModel: searchModel});

        let modelParams = {};
        if (this.props.state) {
            modelParams.data = this.props.state.data;
            modelParams.metaData = this.props.state.metaData;
        } else {
            modelParams.metaData = {
                resModel: this.props.resModel,
            };
        }

        this.model = useModel(this.constructor.Model, modelParams);
    }
}

SpreadsheetView.template = "web_spreadsheet.SpreadsheetView";
// SpreadsheetView.buttonTemplate = "web.SpreadsheetView.Buttons";
SpreadsheetView.components = {Renderer: SpreadsheetRenderer, Layout};
SpreadsheetView.props = {...standardViewProps};

SpreadsheetView.Model = SpreadsheetModel;

SpreadsheetView.type = "spreadsheet";
SpreadsheetView.display_name = _lt("Spreadsheet");
SpreadsheetView.icon = "fa-file-excel-o";
SpreadsheetView.multiRecord = true;

viewRegistry.add("spreadsheet", SpreadsheetView);
