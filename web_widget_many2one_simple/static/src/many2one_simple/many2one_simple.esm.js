/** @odoo-module **/
import {_t} from "web.core";
import {registry} from "@web/core/registry";
import {Many2OneField} from "@web/views/fields/many2one";

export class Many2OneSimpleField extends Many2OneField {
    async search() {
        if (!this.isDirty) {
            return Promise.resolve();
        }
        const search_value = this.$input.val();
        if (search_value === "") {
            this.reinitialize(false);
            return Promise.resolve(false);
        }

        if (this.regex && !this.regex.test(search_value)) {
            this._showErrorMessage(_t("The given search criteria is not valid."));
            this.reinitialize(false);
            return Promise.resolve(false);
        }

        const context = this.record.getContext(
            _.extend({}, this.recordParams, {
                additionalContext: this.attrs.context || {},
            })
        );
        context.many2one_simple = true;
        const domain = this.record.getDomain(this.recordParams);

        return this._rpc({
            model: this.field.relation,
            method: "search_read",
            fields: ["display_name"],
            domain: _.union(domain, this._getDomain()),
            limit: 1,
            kwargs: {context: context},
        }).then((results) => {
            if (_.isEmpty(results)) {
                if (this.can_create) {
                    const create_context = _.extend({}, this.attrs.context);
                    if (this.search.field !== "id") {
                        create_context["default_" + this.search.field] =
                            this.$input.val();
                    }
                    this._createPopup("form", create_context);
                } else {
                    this._showErrorMessage(
                        _t("Can't found any record with the given criteria.")
                    );
                }
                this.reinitialize(false);
            } else {
                this.reinitialize(results[0]);
            }
        });
    }
    /**
     * @private
     *
     * @param {OdooEvent} ev
     */
    onInputKeyup(ev) {
        if (ev.which === $.ui.keyCode.ENTER || ev.which === $.ui.keyCode.TAB) {
            this._search();
        } else {
            this.isDirty = true;
        }
    }
}
Many2OneSimpleField.template = "web_widget_many2one_simple.Many2OneSimpleField";
registry.category("fields").add("many2one_simple", Many2OneSimpleField);
