//-*- coding: utf-8 -*-
//Copyright 2016 Therp BV <http://therp.nl>
//License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

odoo.define('web.web_widget_one2many_tags', function (require) {
    "use strict";

    var core = require('web.core');
    var FieldOne2Many = core.form_widget_registry.get('one2many');
    var common = require('web.form_common');
    var QWeb = core.qweb;

    var FieldOne2ManyTags = FieldOne2Many.extend({
        template: "FieldOne2ManyTags",
        tag_template: "FieldOne2ManyTag",

        events: {
            'click .o_delete': function(e) {
                this.remove_id($(e.target).parent().data('id'));
            }
        },

        init: function(field_manager, node) {
            this._super(field_manager, node);
            common.CompletionFieldMixin.init.call(this);
            this.set({"value": []});
        },
        willStart: function () {
            var self = this;
            return this.dataset.call('fields_get', []).then(function(fields) {
                self.fields = fields;
            });
        },
        commit_value: function() {
            this.dataset.cancel_read();
            return this._super();
        },
        initialize_content: function() {
            if(!this.get("effective_readonly")) {
                this.one2many = new FieldOne2Many(this.field_manager, this.node);
                this.one2many.options.no_open = true;
                this.one2many.on('changed_value', this, function() {
                    var newValue = this.one2many.get('value');
                    if(newValue) {
                        this.add_id(newValue);
                        this.one2many.set({'value': false});
                    }
                });

                this.one2many.prependTo(this.$el);

                var self = this;
                this.one2many.$('input').on('keydown', function(e) {
                    if(!$(e.target).val() && e.which === 8) {
                        var $badges = self.$('.badge');
                        if($badges.length) {
                            self.remove_id($badges.last().data('id'));
                        }
                    }
                });
                this.one2many.get_search_blacklist = function () {
                    return self.get('value');
                };
            }
        },
        destroy_content: function() {
            if(this.one2many) {
                this.one2many.destroy();
                this.one2many = undefined;
            }
        },
        get_render_data: function(ids){
            var self = this;
            this.dataset.cancel_read();
            var fields = ['name'];
            return this.dataset.read_ids(ids, fields);
        },
        render_tag: function(data) {
            this.$('.badge').remove();
            this.$el.prepend(QWeb.render(this.tag_template, {elements: data, readonly: this.get('effective_readonly')}));
        },
        render_value: function() {
            var self = this;
            var values = self.get("value");
            var handle_names = function(data) {
                if (self.isDestroyed())
                    return;
                var indexed = {};
                _.each(data, function(el) {
                    indexed[el['id']] = el;
                });
                data = _.map(values, function(el) { return indexed[el]; });
                self.render_tag(data);
            };
            if (!values || values.length > 0) {
                return self.get_render_data(values).done(handle_names);
            } else {
                handle_names([]);
            }
        },
        add_id: function(id) {
            this.set({'value': _.uniq(this.get('value').concat([id]))});
        },
        remove_id: function(id) {
            this.set({'value': _.without(this.get("value"), id)});
        },
        focus: function () {
            if(!this.get("effective_readonly")) {
                return this.one2many.focus();
            }
            return false;
        },
        set_dimensions: function (height, width) {
            this._super(height, width);
            var $input = this.$('input');
            if (!this.get("effective_readonly") && $input) {
                $input.css('height', height);
            }
        }
    });
    core.form_widget_registry
        .add('one2many_tags', FieldOne2ManyTags);

    return {
        FieldOne2ManyTags: FieldOne2ManyTags
    };

});
