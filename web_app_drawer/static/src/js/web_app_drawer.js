/* Copyright 2016 LasLabs Inc.
 * License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl). */

odoo.define('web_app_drawer.app_drawer', function(require) {
    'use strict';
    
    var $ = require('$');
    var Menu = require('web.Menu');
    var core = require('web.core');
    
    Menu.include({
        
        start: function() {
            //this.is_bound.done(function() {
            //    $('.drawer').drawer();
            //});
            return this._super();
        },
        
        reflow: function() {
            this._super('all_outside');
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
        });
    });
            
});
