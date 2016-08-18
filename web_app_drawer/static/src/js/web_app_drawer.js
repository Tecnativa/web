/* Copyright 2016 LasLabs Inc.
 * License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl). */

odoo.define('web_app_drawer.app_drawer', function(require) {
    'use strict';
    
    var $ = require('$');
    var Menu = require('web.Menu');
    var SearchView = require('web.SearchView');
    var core = require('web.core');
    
    Menu.include({
        // Force all_outside to prevent app icons from going into more menu
        reflow: function() {
            this._super('all_outside');
        },
    });
    
    SearchView.include({
        
        // Prevent focus of search field on mobile devices
        toggle_visibility: function (is_visible) {
            var self = this,
                $searchField = $('div.oe_searchview_input').last();
            $searchField.one('focus', function(){
                if (self.isMobile()) {
                    event.preventDefault();
                }
            });
            return this._super(is_visible);
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
