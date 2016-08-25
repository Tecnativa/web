/* Copyright 2016 LasLabs Inc.
 * License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl). */

odoo.define('web_app_drawer.AppDrawer', function(require) {
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
        
        LEFT: 'left',
        RIGHT: 'right',
        UP: 'up',
        DOWN: 'down',
        
        isOpen: false,
        $selectedAppLink: $(false),
        keyBuffer: '',
        keyBufferTime: 500,
        keyBufferTimeoutEvent: false,
        
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
                    this.directionCodes[e.keyCode]
                );
                this.selectAppLink($link);
            } else {
                var buffer = this.handleKeyBuffer(e.keyCode);
                this.selectAppLink(this.searchAppLinks(buffer));
            }
        },
        
        // It adds to keybuffer, sets expire timer, and returns buffer
        handleKeyBuffer: function(keyCode) {
            this.keyBuffer += String.fromCharCode(keyCode);
            if (this.keyBufferTimeoutEvent) {
                clearTimeout(this.keyBufferTimeoutEvent);
            }
            this.keyBufferTimeoutEvent = setTimeout(this.clearKeyBuffer, this.keyBufferTime);
            return this.keyBuffer;
        },
        
        clearKeyBuffer: function() {
            this.keyBuffer = '';
        },
        
        // It performs close actions & bubbles a ``drawer.closed`` core.bus event
        onDrawerClose: function() {
            this.isOpen = false;
            this.$selectedAppLink = $(false);
            core.bus.trigger('drawer.closed');
            this.$el.one('drawer.opened', $.proxy(this.onDrawerOpen, this));
        },
        
        // Generate x and y coords for app icons
        onDrawerOpen: function() {
            this.isOpen = true;
            this.$appLinks = $('.app-drawer-icon-app').parent();
            this.selectAppLink($(this.$appLinks[0]));
            this.$appLinks.on('mouseenter', $.proxy(this.selectAppLinkEvent, this));
            this.$el.one('drawer.closed', $.proxy(this.onDrawerClose, this));
            core.bus.trigger('drawer.opened');
        },
        
        // It provides a proxy method allowing for app link select w/ events
        selectAppLinkEvent: function(event) {
            this.selectAppLink($(event.currentTarget));
        },
        
        // It selects an app link visibly
        selectAppLink: function($appLink) {
            if ($appLink) {
                this.$selectedAppLink = $appLink;
                $appLink.focus();
            }
        },
        
        /* It searches for app links by name and returns the first match
         * @param query str to search
         * @return jQuery obj
         */
        searchAppLinks: function(query) {
            return this.$appLinks.filter(function() {
                return $(this).data('menuName').toUpperCase().startsWith(query);
            }).first();
        },
        
        /* Find the link adjacent to $appLink in provided direction
         * @param $appLink jQuery obj of App icon link
         * @param direction Array for direction to look [int:x, int:y]
         * @return jQuery obj for adjacent applink
         */
        findAdjacentAppLink: function($appLink, direction) {
            
            var obj = [],
                $objs = this.$appLinks;
            
            switch(direction){
                case this.LEFT:
                    obj = $objs[$objs.index($appLink) - 1];
                    if (!obj) {
                        obj = $objs[$objs.length - 1];
                    }
                    break;
                case this.RIGHT:
                    obj = $objs[$objs.index($appLink) + 1];
                    break;
                case this.UP:
                    $objs = this.getRowObjs($appLink, this.$appLinks);
                    obj = $objs[$objs.index($appLink) - 1];
                    if (!obj) {
                        obj = $objs[$objs.length - 1];
                    }
                    break;
                case this.DOWN:
                    $objs = this.getRowObjs($appLink, this.$appLinks);
                    obj = $objs[$objs.index($appLink) + 1];
                    if (!obj) {
                        obj = $objs[0];
                    }
                    break;
            }
            
            return $(obj);
            
        },
        
        /* Return els in the same row
         * @param @obj jQuery object to get row for
         * @param $grid jQuery objects representing grid
         * @return $objs jQuery objects of row
         */
        getRowObjs: function($obj, $grid) {
            // Filter by object which middle lies within left/right bounds
            function filterWithin(left, right) {
                return function() {
                    var $this = $(this),
                        thisMiddle = $this.offset().left + ($this.width() / 2);
                    return thisMiddle >= left && thisMiddle <= right;
                };
            }
            var left = $obj.offset().left,
                right = left + $obj.outerWidth();
            return $grid.filter(filterWithin(left, right));
        },
        
    });
    
    core.bus.on('web_client_ready', null, function () {
        new AppDrawer();
    });
    
    return AppDrawer;
    
});
