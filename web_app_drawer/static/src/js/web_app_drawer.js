/* Copyright 2016 LasLabs Inc.
 * License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl). */

odoo.define('web_app_drawer', function(require) {
    'use strict';
    
    var $ = require('$');
    var Menu = require('web.Menu');
    var Class = require('web.Class');
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
             $('div.oe_searchview_input').last()
                .one('focus', $.proxy(this.preventMobileFocus, this));
            return this._super(is_visible);
        },
        
        // It prevents focusing of search el on mobile
        preventMobileFocus: function(event) {
            if (this.isMobile()) {
                event.preventDefault();
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
    
    var AppDrawer = Class.extend({
        
        // Constants used as math modifiers for x and y axis
        LEFT: [-1, 0],
        RIGHT: [1, 0],
        UP: [0, 1],
        DOWN: [0, -1],
        
        isOpen: false,
        $selectedAppLink: $(false),
        currentPos: [0, 0],
        
        init: function() {
            this.$el = $('.drawer');
            this.$el.drawer();
            this.directionCodes = {
                37: this.LEFT,  // Left arrow
                39: this.RIGHT,  // Right arrow
                38: this.UP,  // Up arrow
                33: this.UP,  // page up
                40: this.DOWN,  // Down arrow
                34: this.DOWN,  // page down
            };
            var $clickZones = $('.openerp_webclient_container, ' +
                                'a.oe_menu_leaf, ' +
                                'a.oe_menu_toggler'
                                );
            $clickZones.click($.proxy(this.handleClickZones, this));
            this.$el.one('drawer.opened', $.proxy(this.onDrawerOpen, this));
            // Core bus keypress doesn't seem to send arrow keys
            core.bus.on('keydown', this, this.handleNavKeys);
        },
        
        // It provides handlers to hide drawer when "unfocused"
        handleClickZones: function() {
            this.$el.drawer('close');
            $('.oe_secondary_menus_container')
                .parent()
                .collapse('hide');
        },
        
        // It provides keyboard shortcuts for app drawer nav
        handleNavKeys: function(e) {
            if (!this.isOpen){
                return;
            }
            if (Object.keys(this.directionCodes).indexOf(e.keyCode.toString()) !== -1) {
                var $link = this.findAdjacentAppLink(
                    this.$selectedAppLink,
                    this.directionCodes[e.keyCode][0],
                    this.directionCodes[e.keyCode][1]
                );
                this.selectAppLink($link);
            }
        },
        
        onDrawerClose: function() {
            this.isOpen = false;
            this.$selectedAppLink = $(false);
            core.bus.trigger('drawer.closed');
            this.$el.one('drawer.opened', $.proxy(this.onDrawerOpen, this));
        },
        
        // Generate x and y coords for app icons
        onDrawerOpen: function() {
            var self = this;
            this.isOpen = true;
            this.$appLinks = $('.css-app-drawer-icon-app').parent();
            this.selectAppLink($(this.$appLinks[0]));
            this.linkMap = {};  // Key by row, col
            var x = 0,
                y = -1,
                lastTop = -9999,
                newTop = null,
                $lastVal = null;
            _.each(this.$appLinks, function(val) {
                $lastVal = $(val);
                newTop = $lastVal.offset().top;
                if (lastTop < newTop) {
                    y ++;
                    x = 0;
                    self.linkMap[y] = {};
                }
                self.linkMap[y][x] = $lastVal;
                $lastVal.data('pos-x', x).data('pos-y', y);
                x ++;
                lastTop = newTop;
            });
            this.$appLinks.on('mouseenter', $.proxy(this.selectAppLinkEvent, this));
            this.$el.one('drawer.closed', $.proxy(this.onDrawerClose, this));
            core.bus.trigger('drawer.opened');
        },
        
        // It provides a proxy method allowing for app link select w/ events
        selectAppLinkEvent: function(event) {
            this.selectAppLink($(event.target));
        },
        
        // It selects an app link visibly
        selectAppLink: function($appLink) {
            if ($appLink) {
                this.$selectedAppLink = $appLink;
                this.$appLinks.removeClass('keyboard-selected');
                $appLink.addClass('keyboard-selected').focus();
            }
        },
        
        /* Find icon adjacent to app link
         * @param $el App icon link
         * @param x_mod either LEFT, RIGHT, NONE
         * @param y_mod either UP, DOWN, NONE
         * @return jQuery match for adjacent applink (or empty)
         */
        findAdjacentAppLink: function($appLink, x_dir, y_dir) {
            var x = parseInt($appLink.data('posX')) + x_dir,
                y = parseInt($appLink.data('posY')) + y_dir;
            try{
                return this.linkMap[y][x];
            } catch(ex) {
                return;
            }
        },
        
    });
    
    core.bus.on('web_client_ready', null, function () {
        new AppDrawer();
    });
    
    return {
        AppDrawer: AppDrawer,
    };
    
});
