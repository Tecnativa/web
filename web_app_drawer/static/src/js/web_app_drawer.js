/* Copyright 2016 LasLabs Inc.
 * License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl). */

odoo.define('web_app_drawer.app_drawer', function(require) {
    'use strict';
    
    var $ = require('$');
    var Menu = require('web.Menu');
    var SearchView = require('web.SearchView');
    var core = require('web.core');
    
    Menu.include({
        
        reflow: function() {
            this._super('all_outside');
        },
        
    });
    
    SearchView.include({
        
        // ReImplement core toggle_visibility to not focus when mobile
        toggle_visibility: function (is_visible) {
            this.do_toggle(!this.headless && is_visible);
            if (this.$buttons) {
                this.$buttons.toggle(!this.headless && is_visible && this.visible_filters);
            }
            if (!this.headless && is_visible && !this.isMobile()) {
                this.$('div.oe_searchview_input').last().focus();
            }
        },
        
        // For lack of Modernizr, TouchEvent will do
        isMobile: function () {
            try{
                document.createEvent('TouchEvent');
                return true;
            } catch (ex) {
                return false;
            }
        },
        
    });
    
    core.bus.on('web_client_ready', null, function () {
        $('.drawer').drawer();
        var $clickZones = $('.openerp_webclient_container, ' +
                             'a.oe_menu_leaf, ' +
                             'a.oe_menu_toggler'
                             );
        $clickZones.click(function() {
            $('.drawer').drawer('close');
            $('.oe_secondary_menus_container')
                .parent()
                .collapse('hide');
        });
    });
            
});
