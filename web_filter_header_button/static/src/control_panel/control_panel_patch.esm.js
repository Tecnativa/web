import {ControlPanel} from "@web/search/control_panel/control_panel";
import {FilterButton} from "../filter_button/filter_button.esm";
import {Transition} from "@web/core/transition";
import {browser} from "@web/core/browser/browser";
import {patch} from "@web/core/utils/patch";
import {proxy} from "@odoo/owl";
import {user} from "@web/core/user";

patch(ControlPanel, {
    components: {...ControlPanel.components, FilterButton, Transition},
});

patch(ControlPanel.prototype, {
    setup() {
        super.setup(...arguments);
        this.buttonFiltersVisibilityKey = `visibleHeaderButtons${this.env.config.actionId}+${user.userId}`;
        this.headerButtonsState = proxy({
            showButtonFilters:
                Boolean(this.env.config.actionId) &&
                Boolean(
                    JSON.parse(
                        browser.localStorage.getItem(this.buttonFiltersVisibilityKey)
                    )
                ),
        });
    },
    get headerButtonFilters() {
        return this.env.searchModel?.headerButtonFilters || [];
    },
    onClickShowButtonFilters() {
        if (this.headerButtonsState.showButtonFilters) {
            browser.localStorage.removeItem(this.buttonFiltersVisibilityKey);
        } else {
            browser.localStorage.setItem(this.buttonFiltersVisibilityKey, true);
        }
        this.headerButtonsState.showButtonFilters =
            !this.headerButtonsState.showButtonFilters;
    },
});
