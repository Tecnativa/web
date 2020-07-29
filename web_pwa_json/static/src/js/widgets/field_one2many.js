odoo.define("web_pwa_json.FieldOne2Many", function (require) {
    "use strict";

    var core = require("web.core");
    var utils = require("web.utils");
    var FieldOne2Many = require("web.relational_fields").FieldOne2Many;
    var KanbanSearchRenderer = require("web_pwa_json.KanbanSearchRenderer");

    var _t = core._t;
    var qweb = core.qweb;

    FieldOne2Many.include({
        custom_events: _.extend({}, FieldOne2Many.prototype.custom_events, {
            create_quick_record: "_onCreateQuickRecord",
            update_quick_record: "_onUpdateQuickRecord",
        }),

        init: function (parent, name, record, options) {
            this._super.apply(this, arguments);
            this.state = record;
            if (this.view) {
                this.isKanbanSearch =
                    this.view.arch.tag === "kanban" && "search" in this.view.arch.attrs;
                if (this.isKanbanSearch) {
                    this._lazyInputSearch = _.debounce(this._implLazyInputSearch, 250);
                    this._searchText = false;
                    this._processGroups();
                }
            } else {
                this.isKanbanSearch = false;
            }
        },

        start: function () {
            if (!this.isKanbanSearch) {
                return this._super.apply(this, arguments);
            }
            var self = this;
            var def_super = this._super;
            this._searchDomain =
                this.mode === "readonly" ? this._getLinesDomain() : false;
            return this._getSearchRecords().then(function () {
                def_super.apply(self, arguments);
            });
        },

        updateBadgeLines: function () {
            this.$badgeLines.text(this.recordData[this.name].count);
        },

        getBasicFieldParams: function () {
            return {
                domain: this.record.getDomain(this.recordParams),
                field: this.field,
                parentID: this.value.id,
            };
        },

        _getRenderer: function () {
            if (this.isKanbanSearch) {
                return KanbanSearchRenderer;
            }
            return this._super.apply(this, arguments);
        },

        _processGroups: function () {
            this.searchGroups = [];
            var hasUserActive = false;
            for (var elm of this.view.arch.children) {
                if (typeof elm !== "object" || elm.tag !== "group") {
                    continue;
                }

                var group_def = {
                    name: elm.attrs.name,
                    domain: py.eval(elm.attrs.domain || "[]"),
                    active: utils.toBoolElse(elm.attrs.active, false),
                };
                if (group_def.active) {
                    group_def.active = !hasUserActive;
                    hasUserActive = true;
                }
                this.searchGroups.push(group_def);
            }

            this.searchGroups.splice(0, 0, {
                name: _t("All"),
                domain: [],
                active: !hasUserActive,
            });
        },

        /**
         * @override
         */
        _renderControlPanel: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                if (self.isKanbanSearch) {
                    self.control_panel.update({
                        cp_content: {
                            $buttons: self.$buttons,
                            $pager: false,
                        },
                    });
                }
            });
        },

        _renderButtons: function () {
            if (!this.isReadonly && this.isKanbanSearch) {
                this.$buttons = $(qweb.render("KanbanSearch.KanbanSearchButtons"));
                this.$searchInput = this.$buttons.find(".o_kanban_search_input");
                this.$searchInput.on("input", this._onInputSearch.bind(this));
                this.$searchEraser = this.$buttons.find(".o_kanban_search_erase");
                this.$searchEraser.on("click", this._onClickSearchEraser.bind(this));

                this.$groups = $(
                    qweb.render("KanbanSearch.KanbanSearchGroupButtons", {
                        groups: this.searchGroups,
                    })
                );
                this.$btnLines = this.$groups.find(".o_btn_lines");
                this.$badgeLines = this.$btnLines.find(".badge");
                this.$btnLines.on("click", this._onClickLines.bind(this));
                this.$groups.on(
                    "click",
                    ".o_btn_search_kanban_group",
                    this._onClickSearchGroup.bind(this)
                );

                this.updateBadgeLines();

                this.$groups.appendTo(this.$buttons);
            } else {
                return this._super.apply(this, arguments);
            }
        },

        /**
         * @override
         */
        _render: function () {
            var self = this;
            var def = this._super.apply(this, arguments);
            // FIXME: Parent implementation can return 'undefined' :(
            return (
                def &&
                def.then(function () {
                    if (self.isKanbanSearch) {
                        self.$el.addClass("o_field_x2many_search_kanban");
                    }
                })
            );
        },

        _getSearchRecords: function (domain) {
            var self = this;
            var arch = this.view.arch;
            var search_params = py.eval(arch.attrs.search);
            var field_name = search_params[0];
            var field_info = this.view.fieldsInfo[arch.tag][field_name];
            var model = this.view.viewFields[field_info.name].relation;
            var fields = search_params[2];

            var sdomain = domain;
            if (!sdomain) {
                sdomain = _.clone(this._searchDomain) || [];
                if (this._searchText) {
                    sdomain.push([
                        search_params[1],
                        "ilike",
                        "%" + this._searchText + "%",
                    ]);
                }
            }

            return new Promise((resolve) => {
                this._rpc({
                    model: model,
                    method: "search_read",
                    fields: fields,
                    domain: sdomain,
                }).then(function (results) {
                    self._searchRecords = results;
                    if (self.renderer) {
                        self.renderer.setSearchState(self._searchRecords);
                    }
                    resolve();
                });
            });
        },

        _onClickSearchGroup: function (evt) {
            var self = this;
            var $btn = $(evt.target);
            var groupIndex = Number($btn.data("group")) || 0;
            var group = this.searchGroups[groupIndex];
            this._searchDomain = group.domain;
            this._getSearchRecords().then(function () {
                self.renderer._renderView();
            });
            this.$btnLines.removeClass("active");
            $btn.parent().find(".active").removeClass("active");
            $btn.addClass("active");
        },

        _onClickLines: function () {
            this.showLines();
        },

        _getLinesDomain: function () {
            var search_params = py.eval(this.view.arch.attrs.search);
            var ids = _.map(this.recordData[this.name].data, function (line) {
                return line.data[search_params[0]].data.id;
            });
            return [["id", "in", ids]];
        },

        showLines: function () {
            var self = this;
            this.$btnLines.parent().find(".active").removeClass("active");
            this.$btnLines.addClass("active");
            this._searchDomain = this._getLinesDomain();
            this._getSearchRecords().then(function () {
                self.renderer._renderView();
            });
        },

        _onInputSearch: function (evt) {
            this._lazyInputSearch(evt.target.value);
        },

        _onClickSearchEraser: function () {
            this.$searchInput.val("");
            this._lazyInputSearch(this.$searchInput.val());
        },

        _implLazyInputSearch: function (search_text) {
            var self = this;
            this._searchText = search_text;
            this._getSearchRecords().then(function () {
                self.renderer._renderView().then(function () {
                    self.$searchInput.focus();
                });
            });
        },

        _onCreateQuickRecord: function (evt) {
            this._setValue({operation: "ADD", id: evt.data.id});
            // this._setValue({
            //     operation: "CREATE",
            //     data: evt.data.data,
            //     //context: evt.data.context,
            // });
        },

        _onUpdateQuickRecord: function (evt) {
            this._setValue({operation: "UPDATE", id: evt.data.id, data: evt.data.data});
            // this._setValue({
            //     operation: "CREATE",
            //     data: evt.data.data,
            //     //context: evt.data.context,
            // });
        },

        _setValue: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                if (self.isKanbanSearch) {
                    self.updateBadgeLines();
                }
            });
        },
    });
});
