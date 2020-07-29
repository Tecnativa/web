odoo.define("web_pwa_json.SearchQuickCreateForm", function (require) {
    "use strict";

    /**
     * This widget render a Pie Chart. It is used in the dashboard view.
     */

    var Domain = require("web.Domain");
    var viewRegistry = require("web.view_registry");
    var Widget = require("web.Widget");
    var widgetRegistry = require("web.widget_registry");
    var SearchQuickCreateFormView = require("web_pwa_json.SearchQuickCreateFormView");

    var SearchQuickCreateForm = Widget.extend({
        className: "o_kanban_search_quick_create",
        xmlDependencies: [
            "/web_pwa_json/static/src/xml/kanban_search_quick_create.xml",
        ],

        custom_events: {
            reload_view: "_onReloadView",
        },

        /**
         * @override
         * @param {Widget} parent
         * @param {Object} record
         * @param {Object} node node from arch
         */
        init: function (parent, options) {
            this._super.apply(this, arguments);
            this.state = options.state;
            this.node = options.node;
            this.fields = options.fields;
            this.searchParams = options.searchParams;
            this.searchRecord = options.searchRecord;
            this.fieldsInfo = options.fieldsInfo;
            this.readonly = options.readonly;
            this.basicFieldParams = options.basicFieldParams;
            this.editContext = {};
            this.compareKey = this.node.attr("compare-key") || false;
            this.res_id = this.getParent().state && this.getParent().state.res_id;
            this.id = this.getParent().state && this.getParent().state.id;
        },
        /**
         * Instantiates the pie chart view and starts the graph controller.
         *
         * @override
         */
        start: function () {
            var self = this;
            var def1 = this._super.apply(this, arguments);

            var fieldsView = {
                arch: this.node.html(),
                fields: this.fields,
                viewFields: this.fields,
                base_model: this.basicFieldParams.field.relation,
                type: "form",
                model: this.basicFieldParams.field.relation,
            };

            var node_context = this.node.attr("context") || "{}";
            var main_state = this.getParent().getParent().getParent().state;
            this.nodeContext = py.eval(node_context, {
                active_id: main_state.res_id,
            });
            var refinedContext = _.pick(
                _.extend(
                    {},
                    this.state.getContext(),
                    this.nodeContext,
                    this.editContext
                ),
                function (value, key) {
                    return key.startsWith("default_");
                }
            );
            // var refinedContext = _.extend(
            //             {},
            //             this.state.getContext(),
            //             this.nodeContext,
            //             this.editContext
            //         )
            this.formView = new SearchQuickCreateFormView(fieldsView, {
                context: refinedContext,
                compareKey: this.compareKey,
                searchParams: this.searchParams,
                modelName: this.basicFieldParams.field.relation,
                userContext: this.getSession().user_context,
                ids: this.res_id ? [this.res_id] : [],
                currentId: this.res_id || undefined,
                mode: this.res_id && this.readonly ? "readonly" : "edit",
                recordID: this.id,
                field: this.basicFieldParams.field,
                //parentID: this.basicFieldParams.parentID,
                default_buttons: false,
                withControlPanel: false,
                //searchable: false,
                //isMultiRecord: false,
                //controllerID: this.getParent().getParent().getParent().getParent().getParent().controllerID,
                model: this.getParent().getParent().getParent().getParent().getParent()
                    .model,
            });
            var def2 = this.formView.getController(this).then(function (controller) {
                self.controller = controller;
                self.$el.empty();
                self.controller.appendTo(self.$el);
            });

            return $.when(def1, def2);
        },

        on_attach_callback: function () {
            if (this.controller) {
                this.controller.autofocus();
            }
        },

        _onReloadView: function (ev) {
            this.res_id = (ev.data.record && ev.data.record.res_id) || false;
            this.id = (ev.data.record && ev.data.record.id) || false;

            if (!this.id) {
                this.editContext["default_" + this.compareKey] = ev.data.compareValue;
            } else {
                this.editContext["default_" + this.compareKey] = false;
            }
            this.start();
        },
    });

    widgetRegistry.add("search_quick_create_form", SearchQuickCreateForm);

    return SearchQuickCreateForm;
});
