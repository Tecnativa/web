odoo.define("web_pwa_json.KanbanSearchRecord", function (require) {
    "use strict";

    var Widget = require("web.Widget");
    var Domain = require("web.Domain");
    var widgetRegistry = require("web.widget_registry");

    var KanbanSearchRecord = Widget.extend({
        custom_events: {
            quick_record_updated: "_onQuickRecordUpdated",
            restore_flip_card: "_onRestoreFlipCard",
        },
        events: {
            "click .oe_kanban_flip_card_front": "_onClickFlipCardFront",
        },

        init: function (parent, state, options) {
            this._super(parent);
            this.options = options;
            this.read_only_mode = options.read_only_mode;
            this.qweb = options.qweb;
            this.subWidgets = {};
            this._setState(state, options.searchRecord);
        },

        start: function () {
            return $.when(this._super.apply(this, arguments), this._render());
        },

        on_attach_callback: function () {
            _.invoke(this.subWidgets, "on_attach_callback");
        },

        on_detach_callback: function () {
            _.invoke(this.subWidgets, "on_detach_callback");
        },

        update: function (record) {
            // detach the widgets because the record will empty its $el, which will
            // remove all event handlers on its descendants, and we want to keep
            // those handlers alive as we will re-use these widgets
            _.invoke(_.pluck(this.subWidgets, "$el"), "detach");
            this._setState(record);
            return this._render();
        },

        /**
         * @private
         * @param {string} model the name of the model
         * @param {string} field the name of the field
         * @param {integer} id the id of the resource
         * @param {integer} cache the cache duration, in seconds
         * @param {Object} options
         * @returns {string} the url of the image
         */
        _getSearchImage: function (field) {
            var file_type_magic_word = {
                "/": "jpg",
                R: "gif",
                i: "png",
                P: "svg+xml",
            };
            return (
                "data:image/" +
                file_type_magic_word[this.recordSearch[field][0]] +
                ";base64," +
                this.recordSearch[field]
            );
        },

        /**
         * @private
         * @param {string} d a stringified domain
         * @returns {boolean} the domain evaluted with the current values
         */
        _computeDomain: function (d) {
            return new Domain(d).compute(
                (this.state || this.getParent().state).evalContext
            );
        },

        _setState: function (viewState, recordSearch) {
            this.fields = this.getParent().state.fields;
            this.fieldsInfo = this.getParent().state.fieldsInfo.kanban;
            this.state = viewState;
            this.recordSearch = recordSearch;
            this.id = recordSearch.__id;

            this.qweb_context = {
                read_only_mode: this.read_only_mode,
                record_search: this.recordSearch,
                user_context: this.getSession().user_context,
                kanban_image: this._getSearchImage.bind(this),
                kanban_compute_domain: this._computeDomain.bind(this),
                state: this.state,
                widget: this,
            };
        },

        _render: function () {
            this.defs = [];
            this._replaceElement(
                this.qweb.render("kanban-search-box", this.qweb_context)
            );
            this.$front = this.$(".oe_kanban_flip_card_front");
            this.$back = this.$(".oe_kanban_flip_card_back");
            this._processWidgetFields(this.$front);
            this._processWidgets(this.$front);
            return $.when.apply(this, this.defs);
        },

        /**
         * Processes each 'field' tag and replaces it by the specified widget, if
         * any, or directly by the formatted value
         *
         * @private
         */
        _processWidgetFields: function ($container) {
            var self = this;
            $container.find("field").each(function () {
                var $field = $(this);
                if ($field.parents("widget").length) {
                    return;
                }
                var field_name = $field.attr("name");
                var field_widget = $field.attr("widget");

                // a widget is specified for that field or a field is a many2many ;
                // in this latest case, we want to display the widget many2manytags
                // even if it is not specified in the view.
                if (field_widget || self.fields[field_name].type === "many2many") {
                    var widget = self.subWidgets[field_name];
                    if (!widget) {
                        // the widget doesn't exist yet, so instanciate it
                        var Widget = self.fieldsInfo[field_name].Widget;
                        if (Widget) {
                            widget = self._processWidget($field, field_name, Widget);
                            self.subWidgets[field_name] = widget;
                        } else if (config.debug) {
                            // the widget is not implemented
                            $field.replaceWith(
                                $("<span>", {
                                    text: _.str.sprintf(
                                        _t("[No widget %s]"),
                                        field_widget
                                    ),
                                })
                            );
                        }
                    } else {
                        // a widget already exists for that field, so reset it with the new state
                        widget.reset(self.state);
                        $field.replaceWith(widget.$el);
                    }
                }
            });
        },

        /**
         * Replace a field by its corresponding widget.
         *
         * @private
         * @param {JQuery} $field
         * @param {String} field_name
         * @param {Class} Widget
         * @returns {Widget} the widget instance
         */
        _processWidget: function ($field, field_name, Widget) {
            // some field's attrs might be record dependent (they start with
            // 't-att-') and should thus be evaluated, which is done by qweb
            // we here replace those attrs in the dict of attrs of the state
            // by their evaluted value, to make it transparent from the
            // field's widgets point of view
            // that dict being shared between records, we don't modify it
            // in place
            var self = this;
            var attrs = Object.create(null);
            _.each(this.fieldsInfo[field_name], function (value, key) {
                if (_.str.startsWith(key, "t-att-")) {
                    key = key.slice(6);
                    value = $field.attr(key);
                }
                attrs[key] = value;
            });
            var options = _.extend({}, this.options, {attrs: attrs});
            var widget = new Widget(this, field_name, this.getParent().state, options);
            var def = widget.replace($field);
            if (def.state() === "pending") {
                this.defs.push(def);
            }
            return widget;
        },

        _processWidgets: function ($container) {
            var self = this;
            $container.find("widget").each(function () {
                var $field = $(this);
                var Widget = widgetRegistry.get($field.attr("name"));
                var widget = new Widget(self, {
                    fieldsInfo: self.fieldsInfo,
                    fields: self.fields,
                    state: self.getParent().state,
                    searchParams: self.options.searchParams,
                    searchRecord: self.recordSearch,
                    node: $field,
                    readonly: self.read_only_mode,
                    basicFieldParams: self.options.basicFieldParams,
                });

                var def = widget
                    ._widgetRenderAndInsert(function () {})
                    .then(function () {
                        widget.$el.addClass("o_widget");
                        $field.replaceWith(widget.$el);
                    });
                if (def.state() === "pending") {
                    self.defs.push(def);
                }
            });
        },

        _onClickFlipCardFront: function (evt) {
            var $innerCard = this.$(".oe_kanban_flip_card_inner");
            if (this.read_only_mode || $innerCard.hasClass("active")) {
                return;
            }
            this._processWidgetFields(this.$back);
            this._processWidgets(this.$back);
            this.$el.parent().find(".active").removeClass("active");
            $innerCard.addClass("active");
        },

        _onRestoreFlipCard: function (evt) {
            this.$(".oe_kanban_flip_card_inner").removeClass("active");
        },

        _onQuickRecordUpdated: function (ev) {
            var fields_changed = Object.keys(ev.data.changes);
            for (var field_name of fields_changed) {
                var $elm = this.$el.find("[data-field=" + field_name + "]");
                if ($elm.length) {
                    var format_out = $elm.data("format") || field_name;
                    $elm.html(
                        py.eval(
                            format_out,
                            _.extend({}, this.state.data, ev.data.changes)
                        )
                    );
                }
            }
        },
    });

    return KanbanSearchRecord;
});
