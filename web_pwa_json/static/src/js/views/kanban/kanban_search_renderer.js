// Copyright 2020 Tecnativa - Alexandre Díaz
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
odoo.define("web_pwa_json.KanbanSearchRenderer", function (require) {
    "use strict";

    var KanbanRenderer = require("web.KanbanRenderer");
    var KanbanSearchRecord = require("web_pwa_json.KanbanSearchRecord");
    // Ensure 'include' mobile implementation
    require("web.KanbanRendererMobile");

    var KanbanSearchRenderer = KanbanRenderer.extend({
        /**
         * @override
         */
        init: function (parent, state, params) {
            this._super.apply(this, arguments);
            this.activeSection = "search";
            this.view = parent.view;
            this.mode = parent.mode;
            this.name = parent.name;
            this.setSearchState(parent._searchRecords);
        },

        /**
         * @override
         */
        start: function () {
            //this.$el.addClass("d-inline-flex flex-wrap");
            this.$el.addClass("row");
            return this._super.apply(this, arguments);
        },

        setSearchState: function (searchState) {
            this.search_data = searchState;
        },

        setRowMode: function () {
            return $.when();
        },

        /**
         * @override
         */
        _renderView: function () {
            var self = this;
            var oldWidgets = this.widgets;
            this.widgets = [];
            var fragment = document.createDocumentFragment();
            this.defs = [];
            this._renderSearch(fragment);

            var defs = this.defs;
            delete this.defs;
            return $.when.apply($, defs).then(function () {
                _.invoke(oldWidgets, "destroy");
                self.$el.empty();
                self.$el.addClass("o_kanban_" + self.activeSection);
                self.$el.append(fragment);
                self._toggleNoContentHelper();
                if (self._isInDom) {
                    _.invoke(self.widgets, "on_attach_callback");
                }
            });
        },

        /**
         * @private
         * @param {Array[Object]} results
         */
        _processSearchData: function (results) {
            var search_params = py.eval(this.view.arch.attrs.search);
            var records = [];
            for (var index in results) {
                var record = results[index];
                var state_data_found = false;
                for (var state_record of this.state.data) {
                    var field = state_record.data[search_params[0]];
                    if (
                        (typeof field === "object" && field.data.id === record.id) ||
                        field === record.id
                    ) {
                        records.push(
                            _.extend({}, record, {
                                __id: state_record.id,
                            })
                        );
                        state_data_found = true;
                    }
                }
                if (!state_data_found) {
                    records.push(record);
                }
            }

            return records;
        },

        _getRecordDataById: function (id) {
            return _.filter(this.state.data, function (record) {
                return record.id === id;
            })[0];
        },

        _renderSearch: function (fragment) {
            var self = this;
            var records = this._processSearchData(this.search_data);
            _.each(records, function (record) {
                var state_data = self._getRecordDataById(record.__id);
                var kanbanSearchRecord = new KanbanSearchRecord(
                    self,
                    state_data,
                    _.extend({}, self.recordOptions, {
                        searchParams: py.eval(self.view.arch.attrs.search),
                        searchRecord: record,
                        basicFieldParams: self.getParent().getBasicFieldParams(),
                    })
                );
                self.widgets.push(kanbanSearchRecord);
                var def = kanbanSearchRecord.appendTo(fragment);
                if (def.state() === "pending") {
                    self.defs.push(def);
                }
            });
        },
    });

    return KanbanSearchRenderer;
});
