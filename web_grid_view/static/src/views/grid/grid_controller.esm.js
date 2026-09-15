import {CogMenu} from "@web/search/cog_menu/cog_menu";
import {Component} from "@odoo/owl";
import {FormViewDialog} from "@web/views/view_dialogs/form_view_dialog";
import {_t} from "@web/core/l10n/translation";
import {GridRenderer} from "./grid_renderer.esm";
import {Layout} from "@web/search/layout";
import {SearchBar} from "@web/search/search_bar/search_bar";
import {ViewScaleSelector} from "@web/views/view_components/view_scale_selector";
import {standardViewProps} from "@web/views/standard_view_props";
import {useModelWithSampleData} from "@web/model/model";
import {useSearchBarToggler} from "@web/search/search_bar/search_bar_toggler";
import {useSetupAction} from "@web/search/action_hook";
import {useService} from "@web/core/utils/hooks";

export class GridController extends Component {
    static template = "web_grid_view.GridController";
    static components = {CogMenu, GridRenderer, Layout, SearchBar, ViewScaleSelector};
    static props = {
        ...standardViewProps,
        archInfo: {type: Object, optional: true},
        modelParams: {type: Object, optional: true},
        Model: {type: Function, optional: true},
        Renderer: {type: Function, optional: true},
    };

    setup() {
        this.model = useModelWithSampleData(this.props.Model, this.modelParams);
        useSetupAction({getLocalState: () => this.model.exportedState});
        this.searchBarToggler = useSearchBarToggler();
        this.dialogService = useService("dialog");
    }

    get modelParams() {
        return {...this.props.modelParams, ...this.props.state};
    }

    get canCreate() {
        return this.model.archInfo?.activeActions?.create !== false;
    }

    get ranges() {
        return this.model.ranges || [];
    }

    get scales() {
        return Object.fromEntries(
            this.model.ranges.map((range) => [
                range.name,
                {description: range.string || range.name, hotkey: range.hotkey},
            ])
        );
    }

    get activeRangeName() {
        return this.model.activeRange?.name || "";
    }

    get periodLabel() {
        if (!this.model.activeRange) {
            return "";
        }
        const start = this.model.periodStart;
        const end = this.model.periodEnd;
        if (!start?.isValid || !end?.isValid) {
            return "";
        }
        const span = this.model.activeRange.span;
        if (span === "week") {
            return `${start.toFormat("MMM dd")} - ${end.toFormat("MMM dd, yyyy")}`;
        }
        if (span === "month") {
            return start.toFormat("MMMM yyyy");
        }
        if (span === "year") {
            return start.toFormat("yyyy");
        }
        return start.toFormat("MMM dd, yyyy");
    }

    async onRangeSelect(rangeName) {
        await this.model.setRange(rangeName);
    }

    onToggleWeekends() {
        this.model.toggleWeekendVisibility();
    }

    async onPrev() {
        await this.model.moveAnchor("backward");
    }

    async onNext() {
        await this.model.moveAnchor("forward");
    }

    async onToday() {
        await this.model.setTodayAnchor();
    }

    onCellCommit(rowId, colId, value) {
        return this.model.updateCell(rowId, colId, value);
    }

    onAddLine() {
        const formView = this.env.config.views?.find((view) => view[1] === "form");
        this.dialogService.add(FormViewDialog, {
            resModel: this.model.resModel,
            viewId: formView?.[0],
            context: this.props.context,
            title: _t("Add a Line"),
            onRecordSaved: () => this.model.load(this.model._searchParams),
        });
    }
}
