/* Copyright 2016 LasLabs Inc.
 * License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl). */

odoo.define('web_app_drawer', function(require) {
    'use strict';
    
    var $ = require('$');
    var Menu = require('web.Menu');
    var Class = require('web.Class');
    var Widget = require('web.Widget');
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
    
    var AppDrawer = Class.extend({
        
        // Constants used as math modifiers for x and y axis
        LEFT: -1,
        RIGHT: 1,
        UP: 1,
        DOWN: -1,
        NONE: 0,
        KEY_MAP: {
            37: LEFT,  // Left arrow
            39: RIGHT,  // Right arrow
            38: UP,  // Up arrow
            33: UP,  // page up
            40: DOWN,  // Down arrow
            34:DOWN,  // page down
        },
        
        init: function() {
            this.$el = $('.drawer');
            this.$searchField = new AppSearch(this);
            this.$searchField.appendTo($('.css-app-drawer-search-container'));
            var $clickZones = $('.openerp_webclient_container, ' +
                                'a.oe_menu_leaf, ' +
                                'a.oe_menu_toggler'
                                ),
                self = this,
                keyMod = 91,
                keyA = 65;
            this.$el.drawer();
            if (navigator.appVersion.indexOf('Mac') != -1) {
                keyMod = 17;
            }
            var keyMap = {keyA:false, keyCode: false};
            $(window)
                .keydown(function(e) {
                    keyMap[e.keyCode] = true;
                    if (keyMap[keyA] && keyMap[keyMod]) {
                        self.$el.drawer('toggle');
                    }
                })
                .keyup(function(e) {
                    if (e.keyCode in keyMap) {
                        keyMap[e.keyCode] = false;
                    }
                })
                .keypress(function(e) {
                    if (KEY_MAP.keys().indexOf(e.keyCode) !== -1) {
                        self.findAdjacentAppLink();
                    }
                });
            $clickZones.click(function() {
                self.$el.drawer('close');
                $('.oe_secondary_menus_container')
                    .parent()
                    .collapse('hide');
            });
            this.$el.on('drawer.opened', function() {
                self.onDrawerOpen();
            });
        },
        
        /* Generate x and y coords for app icons
         * @return Deferred
         */
        onDrawerOpen: function() {
            var x = 0,
                y = 0,
                lastTop = -9999,
                newTop = null,
                $lastVal = null,
                $appIcons = $('.css-app-drawer-icon-app');
            _.each($appIcons, function(val) {
                $lastVal = $(val.parentElement);
                newTop = $lastVal.offset().top;
                if (lastTop < newTop) {
                    y ++;
                    x = 0;
                }
                // Attrs were not showing up on el using .data()
                $lastVal.attr('data-pos-x', x).attr('data-pos-y', y);
                x ++;
                lastTop = newTop;
            });
            $appIcons.on('mouseenter', function() {
                $appIcons.removeClass('keyboard-selected');
            });
            return $.Deferred();
        },
        
        /* Find icon adjacent to app link
         * @param $el App icon link
         * @param x_mod either LEFT, RIGHT, NONE
         * @param y_mod either UP, DOWN, NONE
         * @return jQuery match for adjacent applink (or empty)
         */
        findAdjacentAppLink: function($appLink, x_dir, y_dir) {
            var x = $appLink.data(posX) + x_dir,
                y = $appLink.data(posY) + y_dir;
            return $('.css-app-drawer-icon-app[data-pos-x="' + x + '"][data-pos-y="' + y + '"]');
        },
        
    });
    
    var AppSearch = Widget.extend({
        
        template: 'web_app_drawer.SearchField',
        
        
    });
    
    core.bus.on('web_client_ready', null, function () {
        new AppDrawer();
    });
    
    return {
        AppDrawer: AppDrawer,
        AppSearch: AppSearch,
    };
    
});
