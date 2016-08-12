/* Copyright 2016 LasLabs Inc.
 * License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl). */

odoo.define('web_app_drawer', function(require) {
    'use strict';
    
    var $ = require('$');
    var base = require('web_editor.base');
    var Menu = require('web.Menu');
    
    Menu.include({
        
        start: function() {
            this.is_bound.done(function() {
                
            });
            return this._super();
        },
        
        reflow: function() {
            this._super('all_outside');
        },
        
    });
    
    base.ready().done(function () {
        
        var slideout = new Slideout({
            'panel': document.getElementById('odooMenuBar'),
            'menu': document.getElementById('odooAppDrawer'),
            'padding': 350,
            'tolerance': 70,
        });
        
        $('.js-toggle-app-drawer').click(function() {
            slideout.toggle();
            var $clickZones = $('.openerp_webclient_container, ' +
                                'a.oe_menu_leaf, ' +
                                'a.oe_menu_toggler'
                                );
            $clickZones.click(function() {
                slideout.toggle();
                $clickZones.off('click');
            });
        });
        
    });
    
});
