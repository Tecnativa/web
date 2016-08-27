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
        keyBuffer: '',
        keyBufferTime: 500,
        keyBufferTimeoutEvent: false,
        
        init: function() {
            this.$el = $('.drawer');
            this.$el.drawer();
            this.directionCodes = {
                'left': this.LEFT,
                'right': this.RIGHT,
                'up': this.UP,
                'pageup': this.UP,
                'down': this.DOWN,
                'pagedown': this.DOWN,
                '+': this.RIGHT,
                '-': this.LEFT,
            };
            var $clickZones = $('.openerp_webclient_container, ' +
                                'a.oe_menu_leaf, ' +
                                'a.oe_menu_toggler'
                                );
            $clickZones.click($.proxy(this.handleClickZones, this));
            this.$el.one('drawer.opened', $.proxy(this.onDrawerOpen, this));
            core.bus.on('resize', this, this.handleWindowResize);
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
        
        // It resizes bootstrap dropdowns for screen
        handleWindowResize: function() {
            $('.dropdown-scrollable').css(
                'max-height', $(window).height() * 0.90
            );
        },
        
        // It provides keyboard shortcuts for app drawer nav
        handleNavKeys: function(e) {
            if (!this.isOpen){
                return;
            }
            var directionCode = $.hotkeys.specialKeys[e.keyCode.toString()];
            if (Object.keys(this.directionCodes).indexOf(directionCode) !== -1) {
                var $link = this.findAdjacentAppLink(
                    this.$el.find('a:first, a:focus').last(),
                    this.directionCodes[directionCode]
                );
                this.selectAppLink($link);
            } else if ($.hotkeys.specialKeys[e.keyCode.toString()] == 'esc') {
                this.handleClickZones();
            } else {
                var buffer = this.handleKeyBuffer(e.keyCode);
                this.selectAppLink(this.searchAppLinks(buffer));
            }
        },
        
        /* It adds to keybuffer, sets expire timer, and returns buffer
         * @returns str of current buffer
         */
        handleKeyBuffer: function(keyCode) {
            this.keyBuffer += String.fromCharCode(keyCode);
            if (this.keyBufferTimeoutEvent) {
                clearTimeout(this.keyBufferTimeoutEvent);
            }
            this.keyBufferTimeoutEvent = setTimeout(
                $.proxy(this.clearKeyBuffer, this),
                this.keyBufferTime
            );
            return this.keyBuffer;
        },
        
        clearKeyBuffer: function() {
            this.keyBuffer = '';
        },
        
        /* It performs close actions
         * @fires ``drawer.closed`` to the ``core.bus``
         * @listens ``drawer.opened`` and sends to onDrawerOpen
         */
        onDrawerClose: function() {
            this.isOpen = false;
            core.bus.trigger('drawer.closed');
            this.$el.one('drawer.opened', $.proxy(this.onDrawerOpen, this));
        },
        
        /* It finds app links and register event handlers
         * @fires ``drawer.opened`` to the ``core.bus``
         * @listens ``drawer.closed`` and sends to :meth:``onDrawerClose``
         */
        onDrawerOpen: function() {
            this.isOpen = true;
            this.$appLinks = $('.app-drawer-icon-app').parent();
            this.selectAppLink($(this.$appLinks[0]));
            this.$el.one('drawer.closed', $.proxy(this.onDrawerClose, this));
            core.bus.trigger('drawer.opened');
        },
        
        // It selects an app link visibly
        selectAppLink: function($appLink) {
            if ($appLink) {
                $appLink.focus();
            }
        },
        
        /* It returns first App Link by its name according to query
         * @param query str to search
         * @return jQuery obj
         */
        searchAppLinks: function(query) {
            return this.$appLinks.filter(function() {
                return $(this).data('menuName').toUpperCase().startsWith(query);
            }).first();
        },
        
        /* It returns the link adjacent to $appLink in provided direction
         * @param $appLink jQuery obj of App icon link
         * @param direction str of direction to go (constants LEFT, UP, etc.)
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
                    if (!obj) {
                        obj = $objs[0];
                    }
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
            
            if (obj.length) {
                event.preventDefault();
            }
            
            return $(obj);
            
        },
        
        /* It returns els in the same row
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
    
    // It inits a new AppDrawer when the web client is ready
    core.bus.on('web_client_ready', null, function () {
        new AppDrawer();
    });
    
    return AppDrawer;
    
});
