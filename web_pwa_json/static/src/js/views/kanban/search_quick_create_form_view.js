odoo.define("web_pwa_json.SearchQuickCreateFormView", function (require) {
    "use strict";

    /**
     * This file defines the QuickCreateFormView, an extension of the FormView that
     * is used by the RecordQuickCreate in Kanban views.
     */

    var QuickCreateFormView = require("web.QuickCreateFormView");
    var core = require("web.core");

    var qweb = core.qweb;

    var SearchQuickCreateFormRenderer = QuickCreateFormView.prototype.config.Renderer.extend(
        {
            /**
             * @override
             */
            start: function () {
                this.$el.addClass("o_kanban_form_view");
                return this._super.apply(this, arguments);
            },

            //--------------------------------------------------------------------------
            // Handlers
            //--------------------------------------------------------------------------

            /**
             * @override
             * @private
             * @param {OdooEvent} ev
             */
            _onNavigationMove: function (ev) {
                var direction = ev.data.direction;
                if (direction === "cancel" || direction === "next_line") {
                    ev.stopPropagation();
                    this.trigger_up(direction === "cancel" ? "cancel" : "add");
                } else {
                    this._super.apply(this, arguments);
                }
            },
        }
    );

    var SearchQuickCreateFormController = QuickCreateFormView.prototype.config.Controller.extend(
        {
            events: _.extend({}, QuickCreateFormView.prototype.events, {
                "click .o_search_kanban_add": "_onClickAdd",
                "click .o_search_kanban_remove": "_onClickRemove",
                "click .o_search_kanban_change": "_onClickChange",
                "click .o_search_kanban_discard": "_onClickDiscard",
            }),

            init: function (parent, model, renderer, params) {
                this._super.apply(this, arguments);

                this.compareKey = params.compareKey;
                this.searchParams = params.searchParams;
                this.context = params.context;
            },

            // _renderControlPanelElements: function () {
            //     this._updateButtons();
            //     return this._super.apply(this, arguments);
            // },

            _updateButtons: function () {
                var record = this.model.get(this.handle);
                var state = "record";
                if (!("res_id" in record)) {
                    state = "new";
                } else if (record.isDirty()) {
                    state = "dirty";
                }
                console.log("---> THE STATE");
                console.log(state);
                this.$el.find(".o_kanban_search_form_buttons").remove();
                this.$el.find(".o_form_view").append(
                    qweb.render("web_pwa_json.KanbanSearchQuickCreate.FormButtons", {
                        state: state,
                    })
                );
            },

            _disableQuickCreate: function () {
                this._disabled = true; // ensures that the record won't be created twice
                this.$el.addClass("o_disabled");
                this.$("input:not(:disabled)")
                    .addClass("o_temporarily_disabled")
                    .attr("disabled", "disabled");
            },

            _enableQuickCreate: function () {
                this._disabled = false; // allows to create again
                this.$el.removeClass("o_disabled");
                this.$("input.o_temporarily_disabled")
                    .removeClass("o_temporarily_disabled")
                    .attr("disabled", false);
            },

            _getOriginalRecord: function (field, value) {
                for (var record of this.getParent().state.data) {
                    var fieldSearch = this.searchParams[0];
                    var field = record.data[this.compareKey];
                    if (
                        ((typeof field === "object" && field.data.id === value) ||
                            field === value) &&
                        record.data[fieldSearch].data.id ===
                            this.context["default_" + fieldSearch]
                    ) {
                        return record;
                    }
                }
                return false;
            },

            _onFieldChanged: function (ev) {
                var origRecord = false;
                var fields_changed = Object.keys(ev.data.changes);
                if (fields_changed.includes(this.compareKey)) {
                    var field = ev.data.changes[this.compareKey];
                    var new_value = false;
                    if (typeof field === "object") {
                        new_value = field.id;
                    } else {
                        new_value = field;
                    }
                    origRecord = this._getOriginalRecord(this.compareKey, new_value);
                    this.trigger_up("reload_view", {
                        record: origRecord,
                        compareValue: new_value,
                    });

                    // Discard current change
                    ev.data.changes = {};
                }
                this._super.apply(this, arguments);
                if (_.some(ev.data.changes)) {
                    this.trigger_up("quick_record_updated", {
                        changes: ev.data.changes,
                    });
                    this._updateButtons();
                }
            },

            _add: function (options) {
                if (this._disabled) {
                    // don't do anything if we are already creating a record
                    return $.Deferred();
                }
                var self = this;
                this._disableQuickCreate();
                return this.saveRecord(this.handle, {
                    stayInEdit: true,
                    reload: true,
                    savePoint: false,
                    viewType: "form",
                }).then(function (changedFields) {
                    self._enableQuickCreate();
                    var record = self.model.get(self.handle);
                    //debugger;
                    //self._updatePager();
                    self.trigger_up("create_quick_record", {
                        id: record.id,
                    });
                });
            },

            _onClickAdd: function (ev) {
                ev.stopPropagation();
                this._add();
            },

            _onClickRemove: function (ev) {
                ev.stopPropagation();
                this.trigger_up("list_record_remove", {id: this.renderer.state.id});
            },

            _onClickChange: function (ev) {
                var self = this;
                ev.stopPropagation();
                var record = this.model.get(this.handle);
                this.trigger_up("update_quick_record", {
                    id: record.id,
                });
                this.trigger_up("restore_flip_card");
            },

            _onClickDiscard: function (ev) {
                ev.stopPropagation();
                this.model.discardChanges(this.handle, {
                    rollback: this.shouldSaveLocally,
                });
                var record = this.model.get(this.handle);
                this._updateButtons();
                this.reload();
                this.trigger_up("quick_record_updated", {
                    changes: record.data,
                });
                this.trigger_up("restore_flip_card");
            },
        }
    );

    var SearchQuickCreateFormView = QuickCreateFormView.extend({
        config: _.extend({}, QuickCreateFormView.prototype.config, {
            Renderer: SearchQuickCreateFormRenderer,
            Controller: SearchQuickCreateFormController,
        }),

        init: function (viewInfo, params) {
            this._super.apply(this, arguments);
            this.controllerParams.compareKey = params.compareKey;
            this.controllerParams.searchParams = params.searchParams;
            this.controllerParams.context = params.context;
        },

        // _processFieldsView: function (fieldsView, viewType) {
        //     var fv = this._super.apply(this, arguments);
        //     viewType = viewType || this.viewType;
        //     fv.type = viewType;
        //     fv.fieldsInfo = Object.create(null);
        //     fv.fieldsInfo[viewType] = Object.create(null);

        //     this._processArch(fv.arch, fv);

        //     return fv;
        // },
    });

    return SearchQuickCreateFormView;
});
