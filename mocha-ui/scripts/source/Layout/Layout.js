/*

Script: Layout.js
	Create web application layouts. Enables window maximize. 
	
Copyright:
	Copyright (c) 2007-2008 Greg Houston, <http://greghoustondesign.com/>.		
	
License:
	MIT-style license.	

Requires:
	Core.js, Window.js
	
*/

MochaUI.Desktop = new Class({
							
	Extends: MochaUI.Window,
	
	Implements: [Events, Options],
	
	options: {         		
		// Naming options:
		// If you change the IDs of the Mocha Desktop containers in your HTML, you need to change them here as well.
		desktop:                'desktop',
		desktopHeader:          'desktopHeader',
		desktopFooter:          'desktopFooter',		
		desktopNavBar:          'desktopNavbar',
		pageWrapper:            'pageWrapper',
		page:                   'page',
		desktopFooter:          'desktopFooterWrapper'
	},	
	initialize: function(options){
		this.setOptions(options);
		this.desktop                = $(this.options.desktop);
		this.desktopHeader          = $(this.options.desktopHeader);
		this.desktopFooter          = $(this.options.desktopFooter);				
		this.desktopNavBar          = $(this.options.desktopNavBar);
		this.pageWrapper            = $(this.options.pageWrapper);
		this.page                   = $(this.options.page);
		this.desktopFooter          = $(this.options.desktopFooter);		
	
		// This is run on dock initialize so no need to do it twice.
		if (!MochaUI.Dock.dockWrapper) {
			this.setDesktopSize();
		}
		this.menuInitialize();		

		// Resize desktop, page wrapper, modal overlay, and maximized windows when browser window is resized
		window.addEvent('resize', function(){
			this.onBrowserResize();
		}.bind(this));		
	},
	menuInitialize: function(){
		// Fix for dropdown menus in IE6
		if (Browser.Engine.trident4 && this.desktopNavBar){
			this.desktopNavBar.getElements('li').each(function(element) {
				element.addEvent('mouseenter', function(){
					this.addClass('ieHover');
				});
				element.addEvent('mouseleave', function(){
					this.removeClass('ieHover');
				});
			});
		};
	},
	onBrowserResize: function(){
		this.setDesktopSize();
		// Resize maximized windows to fit new browser window size
		setTimeout( function(){
			MochaUI.Windows.instances.each(function(instance){
				if (instance.isMaximized) {

					// Hide iframe while resize for better performance
					if ( instance.iframeEl ) {
						instance.iframeEl.setStyle('visibility', 'hidden');
					}

					var coordinates = document.getCoordinates();
					var borderHeight = instance.contentBorderEl.getStyle('border-top').toInt() + instance.contentBorderEl.getStyle('border-bottom').toInt();
					var toolbarHeight = instance.toolbarWrapperEl ? instance.toolbarWrapperEl.getStyle('height').toInt() + instance.toolbarWrapperEl.getStyle('border-top').toInt() : 0;					
					instance.contentWrapperEl.setStyles({
						'height': coordinates.height - instance.options.headerHeight - instance.options.footerHeight - borderHeight - toolbarHeight,
						'width': coordinates.width
					});

					instance.drawWindow($(instance.options.id));
					if ( instance.iframeEl ) {
						instance.iframeEl.setStyles({
							'height': instance.contentWrapperEl.getStyle('height')
						});
						instance.iframeEl.setStyle('visibility', 'visible');
					}

				}
			}.bind(this));
		}.bind(this), 100);		
	},
	setDesktopSize: function(){
		var windowDimensions = window.getCoordinates();

		// var dock = $(MochaUI.options.dock);
		var dockWrapper = $(MochaUI.options.dockWrapper);
		
		// Setting the desktop height may only be needed by IE7
		if (this.desktop){
			this.desktop.setStyle('height', windowDimensions.height);
		}

		// Set pageWrapper height so the dock doesn't cover the pageWrapper scrollbars.
		if (this.pageWrapper) {
		
			var dockOffset = MochaUI.dockVisible ? dockWrapper.offsetHeight : 0;
			var pageWrapperHeight = windowDimensions.height;
			pageWrapperHeight -= this.pageWrapper.getStyle('border-top').toInt();
			pageWrapperHeight -= this.pageWrapper.getStyle('border-bottom').toInt();
			if (this.desktopHeader){ pageWrapperHeight -= this.desktopHeader.offsetHeight; }
			if (this.desktopFooter){ pageWrapperHeight -= this.desktopFooter.offsetHeight; }
			pageWrapperHeight -= dockOffset;
									
			if (pageWrapperHeight < 0) {
				pageWrapperHeight = 0;
			}
			this.pageWrapper.setStyle('height', pageWrapperHeight);
		}

		this.resizePanels();		
	},

	resizePanels: function(){
		if (Browser.Engine.trident4) {
			$$('.pad').setStyle('display', 'none');
			$$('.rHeight').setStyle('height', 1);
		}
		panelHeight();
		rWidth();
		if (Browser.Engine.trident4) $$('.pad').setStyle('display', 'block');		
	},
	/*
	
	Function: maximizeWindow
		Maximize a window.
	
	Syntax:
		(start code)
		MochaUI.Desktop.maximizeWindow(windowEl);
		(end)	

	*/	
	maximizeWindow: function(windowEl) {

		var currentInstance = MochaUI.Windows.instances.get(windowEl.id);
		var options = currentInstance.options;
		var windowDrag = currentInstance.windowDrag;

		// If window no longer exists or is maximized, stop
		if (windowEl != $(windowEl) || currentInstance.isMaximized ) return;
		
		if (currentInstance.isCollapsed){
			MochaUI.collapseToggle(windowEl);	
		}

		currentInstance.isMaximized = true;
		
		// If window is restricted to a container, it should not be draggable when maximized.
		if (currentInstance.options.restrict){
			windowDrag.detach();
			if (options.resizable) {
				currentInstance.detachResizable();
			}
			currentInstance.titleBarEl.setStyle('cursor', 'default');
		}	
		
		// If the window has a container that is not the desktop
		// temporarily move the window to the desktop while it is minimized.
		if (options.container != this.desktop){
			this.desktop.grab(windowEl);
			if (this.options.restrict){
			windowDrag.container = this.desktop;
			}
		}		
		
		// Save original position
		currentInstance.oldTop = windowEl.getStyle('top');
		currentInstance.oldLeft = windowEl.getStyle('left');
		
		var contentWrapperEl = currentInstance.contentWrapperEl;
		
		// Save original dimensions
		contentWrapperEl.oldWidth = contentWrapperEl.getStyle('width');
		contentWrapperEl.oldHeight = contentWrapperEl.getStyle('height');
		
		// Hide iframe
		// Iframe should be hidden when minimizing, maximizing, and moving for performance and Flash issues
		if ( currentInstance.iframeEl ) {
			currentInstance.iframeEl.setStyle('visibility', 'hidden');
		}

		var windowDimensions = document.getCoordinates();
		var options = currentInstance.options;
		var shadowBlur = options.shadowBlur;
		var shadowOffset = options.shadowOffset;
		var newHeight = windowDimensions.height - options.headerHeight - options.footerHeight;
		newHeight -= currentInstance.contentBorderEl.getStyle('border-top').toInt();
		newHeight -= currentInstance.contentBorderEl.getStyle('border-bottom').toInt();
		newHeight -= (  currentInstance.toolbarWrapperEl ? currentInstance.toolbarWrapperEl.getStyle('height').toInt() + currentInstance.toolbarWrapperEl.getStyle('border-top').toInt() : 0);

		if (MochaUI.options.useEffects == false){
			windowEl.setStyles({
				'top': shadowOffset.y - shadowBlur,
				'left': shadowOffset.x - shadowBlur
			});
			currentInstance.contentWrapperEl.setStyles({
				'height': newHeight,
				'width':  windowDimensions.width
			});
			currentInstance.drawWindow(windowEl);
			// Show iframe
			if ( currentInstance.iframeEl ) {
				currentInstance.iframeEl.setStyle('visibility', 'visible');
			}
			currentInstance.fireEvent('onMaximize', windowEl);
		}
		else {
						
			// Todo: Initialize the variables for these morphs once in an initialize function and reuse them
			
			var maximizeMorph = new Fx.Elements([contentWrapperEl, windowEl], { 
				duration: 70,
				onStart: function(windowEl){
					currentInstance.maximizeAnimation = currentInstance.drawWindow.periodical(20, currentInstance, windowEl);
				}.bind(this),
				onComplete: function(windowEl){
					$clear(currentInstance.maximizeAnimation);
					currentInstance.drawWindow(windowEl);
					// Show iframe
					if ( currentInstance.iframeEl ) {
						currentInstance.iframeEl.setStyle('visibility', 'visible');
					}
					currentInstance.fireEvent('onMaximize', windowEl);	
				}.bind(this)
			});
			maximizeMorph.start({
				'0': {	'height': newHeight,
						'width':  windowDimensions.width
				},
				'1': {	'top': shadowOffset.y - shadowBlur,
						'left': shadowOffset.x - shadowBlur 
				}
			});		
		}
		currentInstance.maximizeButtonEl.setProperty('title', 'Restore');
		MochaUI.focusWindow(windowEl);

	},
	/*
	
	Function: restoreWindow
		Restore a maximized window.
	
	Syntax:
		(start code)
		MochaUI.Desktop.restoreWindow(windowEl);
		(end)	

	*/	
	restoreWindow: function(windowEl) {	
	
		var currentInstance = MochaUI.Windows.instances.get(windowEl.id);
		
		// Window exists and is maximized ?
		if (windowEl != $(windowEl) || !currentInstance.isMaximized) return;
			
		var options = currentInstance.options;		
		currentInstance.isMaximized = false;
		
		if (options.restrict){
			currentInstance.windowDrag.attach();
			if (options.resizable) {
				currentInstance.reattachResizable();
			}			
			currentInstance.titleBarEl.setStyle('cursor', 'move');
		}		
		
		// Hide iframe
		// Iframe should be hidden when minimizing, maximizing, and moving for performance and Flash issues
		if ( currentInstance.iframeEl ) {
			currentInstance.iframeEl.setStyle('visibility', 'hidden');
		}
		
		var contentWrapperEl = currentInstance.contentWrapperEl;
		
		if (MochaUI.options.useEffects == false){
			contentWrapperEl.setStyles({
				'width':  contentWrapperEl.oldWidth,
				'height': contentWrapperEl.oldHeight
			});
			currentInstance.drawWindow(windowEl);
			windowEl.setStyles({
				'top': currentInstance.oldTop,
				'left': currentInstance.oldLeft
			});
			if ( currentInstance.iframeEl ) {
				currentInstance.iframeEl.setStyle('visibility', 'visible');
			}			
			if (options.container != this.desktop){
				$(options.container).grab(windowEl);
				if (options.restrict){
					currentInstance.windowDrag.container = $(options.container);
				}
			}
			currentInstance.fireEvent('onRestore', windowEl);
		}
		else {
			var restoreMorph = new Fx.Elements([contentWrapperEl, windowEl], { 
				'duration':   150,
				'onStart': function(windowEl){
					currentInstance.maximizeAnimation = currentInstance.drawWindow.periodical(20, currentInstance, windowEl);			
				}.bind(this),
				'onComplete': function(el){
					$clear(currentInstance.maximizeAnimation);
					currentInstance.drawWindow(windowEl);
					if ( currentInstance.iframeEl ) {
						currentInstance.iframeEl.setStyle('visibility', 'visible');
					}
					if (options.container != this.desktop){
						$(options.container).grab(windowEl);
						if (options.restrict){	
							currentInstance.windowDrag.container = $(options.container);
						}
					}
					currentInstance.fireEvent('onRestore', windowEl);
				}.bind(this)
			});
			restoreMorph.start({ 
				'0': {	'height': contentWrapperEl.oldHeight,
						'width':  contentWrapperEl.oldWidth
				},
				'1': {	'top':  currentInstance.oldTop,
						'left': currentInstance.oldLeft
				}
			});
		}
		currentInstance.maximizeButtonEl.setProperty('title', 'Maximize');	
	}
});
MochaUI.Desktop.implement(new Options, new Events);

/*

Class: Column
	Create a column.

Syntax:
(start code)
	MochaUI.Panel();
(end)
		
*/
MochaUI.Column = new Class({
							
	Extends: MochaUI.Desktop,
	
	Implements: [Events, Options],
	
	options: {
		id:            null, // This must be set when creating the column.
		placement:     null, // Can be 'right', 'main', or 'left'.
		width:         null,
		resizeLimit:   [],
		
		// Events
		onResize:     $empty, 
		onCollapse:   $empty, // NOT YET IMPLEMENTED
		onExpand:     $empty  // NOT YET IMPLEMENTED

	},	
	initialize: function(options){
		this.setOptions(options);
		
		$extend(this, {						
			timestamp: $time(),
			isCollapsed: false,
			oldWidth: 0
		});
		
		// Shorten object chain
		var options = this.options;
		var instances = MochaUI.Columns.instances;
		var instanceID = instances.get(options.id);
	
		// Check to see if there is already a class instance for this Column
		if (instanceID){			
			var currentInstance = instanceID;		
		}
		
		// Check if column already exists
		if ( this.columnEl ) {
			return;
		}
		else {			
			instances.set(options.id, this);
		}		
				
		this.columnEl = new Element('div', {
			'id': this.options.id,												   
			'class': 'column expanded',
			'styles': {
				'width': options.width
			}			
		}).inject($(MochaUI.Desktop.pageWrapper));
		
		if (options.id == 'mainColumn') {
			this.columnEl.addClass('rWidth');
		}
		
		this.spacerEl = new Element('div', {
			'id': this.options.id + '_spacer',
			'class': 'horizontalHandle'
		}).inject(this.columnEl);		

		switch (this.options.placement) {
			case 'left':
				this.handleEl = new Element('div', {
					'id': this.options.id + '_handle',
					'class': 'columnHandle'
				}).inject(this.columnEl, 'after');
		
				this.handleIconEl = new Element('div', {
					'id': options.id + '_handle_icon',
					'class': 'handleIcon'
				}).inject(this.handleEl);
			
				addResizeRight(this.columnEl, options.resizeLimit[0], options.resizeLimit[1]);
				break;
			case 'right':
				this.handleEl = new Element('div', {
					'id': this.options.id + '_handle',
					'class': 'columnHandle'
				}).inject(this.columnEl, 'before');
		
				this.handleIconEl = new Element('div', {
					'id': options.id + '_handle_icon',
					'class': 'handleIcon'
				}).inject(this.handleEl);			
				addResizeLeft(this.columnEl, options.resizeLimit[0], options.resizeLimit[1]);
				break;
		}
		
		if (this.handleEl != null) {
			this.handleEl.addEvent('dblclick', function(event){
				this.columnToggle();				
			}.bind(this));
		}
		
		rWidth();		
				
	},
	columnToggle: function(){
		var column= this.columnEl;
							
		if (this.isCollapsed == false) {
			this.oldWidth = column.getStyle('width').toInt();
			
			this.resize.detach();
			this.handleEl.setStyle('cursor', 'pointer').addClass('detached');
			
			column.setStyle('width', 0);
			this.isCollapsed = true;
			column.addClass('collapsed');
			column.removeClass('expanded');
			rWidth();
		}
		else {
			column.setStyle('width', this.oldWidth);
			this.isCollapsed = false;
			column.addClass('expanded');
			column.removeClass('collapsed');
			
			this.resize.attach();
			this.handleEl.setStyle('cursor', 'e-resize').addClass('attached');
			
			rWidth();
		}		
	}
});	
MochaUI.Column.implement(new Options, new Events);		

/*

Class: Panel
	Create a panel.

Syntax:
(start code)
	MochaUI.Panel();
(end)
		
*/
MochaUI.Panel = new Class({
							
	Extends: MochaUI.Desktop,
	
	Implements: [Events, Options],
	
	options: {
		id:               null,        // This must be set when creating the panel
		title:            'New Panel',
		column:           null,        // Where to inject the panel. This must be set when creating the panel
		loadMethod:       'html',
		contentURL:       'pages/lipsum.html',	
	
		// xhr options
		evalScripts:      true,
		evalResponse:     false,
	
		// html options
		content:          'Panel content',		
		
		// Tabs
		tabsURL:          null,				

		footer:           false,
		footerURL:        'pages/lipsum.html',
		
		// Style options:
		height:           125,
		addClass:         '',
		scrollbars:       true,
		padding:   		  { top: 8, right: 8, bottom: 8, left: 8 },

		// Color options:		
		panelBackground:   '#fff',			

		// Events
		onBeforeBuild:     $empty,
		onContentLoaded:   $empty,
		onResize:          $empty,
		onCollapse:        $empty,
		onExpand:          $empty		
				
	},	
	initialize: function(options){
		this.setOptions(options);
		
		$extend(this, {
			timestamp: $time(),
			isCollapsed: false,			
			oldHeight: 0,
			partner: null
		});		
				
		// Shorten object chain
		var instances = MochaUI.Panels.instances;
		var instanceID = instances.get(this.options.id);
	
		// Check to see if there is already a class instance for this panel
		if (instanceID){			
			var currentInstance = instanceID;		
		}
		
		// Check if panel already exists
		if ( this.panelEl ) {
			return;
		}
		else {			
			instances.set(this.options.id, this);
		}
		
		this.fireEvent('onBeforeBuild');		
		
		if (this.options.loadMethod == 'iframe') {
			// Iframes have their own scrollbars and padding.
			this.options.scrollbars = false;
			this.options.padding = { top: 0, right: 0, bottom: 0, left: 0 };
		}				

		this.showHandle = true;
		if ($(this.options.column).getChildren().length == 0) {
			this.showHandle = false;
		}

		this.panelEl = new Element('div', {
			'id': this.options.id,												   
			'class': 'panel expanded',
			'styles': {
				'height': this.options.height,
				'background': this.options.panelBackground
			}			
		}).inject($(this.options.column));
		
		this.panelEl.addClass(this.options.addClass);		
		
		this.contentEl = new Element('div', {
			'id': this.options.id + '_pad',												   
			'class': 'pad'
		}).inject(this.panelEl);
		
		if (this.options.footer) {
			this.footerWrapperEl = new Element('div', {
				'id': this.options.id + '_panelFooterWrapper',
				'class': 'panel-footerWrapper'
			}).inject(this.panelEl);
			
			this.footerEl = new Element('div', {
				'id': this.options.id + '_panelFooter',
				'class': 'panel-footer'
			}).inject(this.footerWrapperEl);			


			MochaUI.updateContent({
				'element':       this.panelEl,
				'childElement':  this.footerEl,
				'loadMethod':    'xhr',				
				'url':           this.options.footerURL
			});
			
		}

		// This is in order to use the same variable as the windows do in updateContent.
		// May rethink this.		
		this.contentWrapperEl = this.panelEl;		
		
		// Set scrollbars, always use 'hidden' for iframe windows
		this.contentWrapperEl.setStyles({
			'overflow': this.options.scrollbars && !this.iframeEl ? 'auto' : 'hidden'
		});

		this.contentEl.setStyles({
			'padding-top': this.options.padding.top,
			'padding-bottom': this.options.padding.bottom,
			'padding-left': this.options.padding.left,
			'padding-right': this.options.padding.right
		});			
		
		this.panelHeaderEl = new Element('div', {
			'id': this.options.id + '_header',												   
			'class': 'panel-header'
		}).inject(this.panelEl, 'before');		
		
		this.panelHeaderToolboxEl = new Element('div', {
			'id': this.options.id + '_headerToolbox',										   
			'class': 'panel-header-toolbox'
		}).inject(this.panelHeaderEl);

		this.collapseToggleEl = new Element('div', {
			'id': this.options.id + '_minmize',
			'class': 'panel-collapse icon16',
			'styles': {
				'width': 16,
				'height': 16
			},
			'title': 'Collapse Panel',
			'background': '#f00'
		}).inject(this.panelHeaderToolboxEl);
        
		this.collapseToggleEl.addEvent('click', function(event){
 			var panel = this.panelEl;
			
			// Get siblings and make sure they are not all collapsed.
			var instances = MochaUI.Panels.instances;
			var expandedSiblings = [];			
			panel.getAllPrevious('.panel').each(function(sibling){
				var currentInstance = instances.get(sibling.id);
				if (currentInstance.isCollapsed == false){
					expandedSiblings.push(sibling);
				}					
			});
			panel.getAllNext('.panel').each(function(sibling){
				var currentInstance = instances.get(sibling.id);
				if (currentInstance.isCollapsed == false){
					expandedSiblings.push(sibling);
				}					
			});			
			
			if (this.isCollapsed == false) {
				var currentColumn = MochaUI.Columns.instances.get($(this.options.column).id);
				
				if (expandedSiblings.length == 0 && currentColumn.options.placement != 'main') {
					var currentColumn = MochaUI.Columns.instances.get($(this.options.column).id);
					currentColumn.columnToggle();
					return;
				}
				else if (expandedSiblings.length == 0 && currentColumn.options.placement == 'main') {
					return;	
				}
				this.oldHeight = panel.getStyle('height').toInt();
				if (this.oldHeight < 10) this.oldHeight = 20;
				panel.setStyle('height', 0);
				this.isCollapsed = true;				
				panel.addClass('collapsed');
				panel.removeClass('expanded');			
				panelHeight(this.options.column, panel, 'collapsing');
				this.collapseToggleEl.removeClass('panel-collapsed');
				this.collapseToggleEl.addClass('panel-expand');
				this.collapseToggleEl.setProperty('title','Expand Panel');
				this.fireEvent('onCollapse');				
			}
			else {
				panel.setStyle('height', this.oldHeight);
				this.isCollapsed = false;
				panel.addClass('expanded');
				panel.removeClass('collapsed');				
				panelHeight(this.options.column, panel, 'expanding');				
				this.collapseToggleEl.removeClass('panel-expand');
				this.collapseToggleEl.addClass('panel-collapsed');
				this.collapseToggleEl.setProperty('title','Collapse Panel');
				this.fireEvent('onExpand');				
			}
		}
		.bind(this));
		
		this.panelHeaderContentEl = new Element('div', {
			'id': this.options.id + '_headerContent',												   
			'class': 'panel-headerContent'
		}).inject(this.panelHeaderEl);									
		
		this.titleEl = new Element('h2', {
			'id': this.options.id + '_title'
		}).inject(this.panelHeaderContentEl);		
		
		if (this.options.tabsURL == null) {
			this.titleEl.set('html', this.options.title);
		}
		else {
			MochaUI.updateContent({
				'element':      this.panelEl,
				'childElement': this.panelHeaderContentEl,
				'loadMethod':   'xhr',								
				'url':          this.options.tabsURL
			});		
		}				
				
		this.handleEl = new Element('div', {
			'id': this.options.id + '_handle',
			'class': 'horizontalHandle',
			'styles': {
				'display': this.showHandle == true ? 'block' : 'none' 
			}
		}).inject(this.panelEl, 'after');
		
		this.handleIconEl = new Element('div', {
			'id': this.options.id + '_handle_icon',
			'class': 'handleIcon'
		}).inject(this.handleEl);		
								
		addResizeBottom(this.options.id);
		
			
		// Add content to panel.
		MochaUI.updateContent({
			'element': this.panelEl,
			'content':  this.options.content,
			'url':      this.options.contentURL
		});			
		
		panelHeight(this.options.column, this.panelEl, 'new');				
					
	}
});
MochaUI.Panel.implement(new Options, new Events);

	// Panel Height
	
	/*
	For each column, find the column height. Get the available space.
	Add available space to any panel that does not have its height set.
	If there is more than one, divide the available space among them.
	If all panels have their height set, divide the available space among
	the open panels equally.
	
	*/
	
	function panelHeight(column, changing, action){
		if (column != null) {
			this.panelHeight2($(column), changing, action);
		}
		else {
			$$('.column').each(function(column){
				panelHeight2(column);
			}.bind(this));
		}
	}
	/*
	
	actions can be new, collapsing or expanding.
	
	*/
	function panelHeight2(column, changing, action){									
	
			var instances = MochaUI.Panels.instances;		
			
			var columnHeight = column.offsetHeight.toInt();			
			var heightNotSet = []; // Panels than do not have their height set. MAY NOT END UP USING THIS.
			
			var panels = column.getChildren('.panel'); // All the panels in the column.
			var panelsExpanded = column.getChildren('.expanded'); // All the expanded panels in the column.		
			var panelsToResize = [];    // All the panels in the column whose height will be effected.
			var tallestPanel;           // The panel with the greatest height
			var tallestPanelHeight = 0;
			
			this.panelsHeight = 0;		// Height of all the panels in the column	
			this.height = 0;            // Height of all the elements in the column			
			
			// Handle logic:
			// - Partner up expanded panels with first expanded panel below them.
			// - Detach handle event if panel is collapsed.
			
			panels.each(function(panel){				
				currentInstance = instances.get(panel.id);
				if (panel.hasClass('expanded') && panel.getNext('.expanded')) {						
					currentInstance.partner = panel.getNext('.expanded');
					currentInstance.resize.attach();
					currentInstance.handleEl.setStyles({
						'display': 'block',
						'cursor': 'n-resize'
					}).removeClass('detached'); 						
				}
				else {
					currentInstance.resize.detach();
					currentInstance.handleEl.setStyle('cursor', null).addClass('detached');					
				}
				if (panel.getNext('.panel') == null) {
					currentInstance.handleEl.setStyle('display', 'none');
				}
			});			 
			
			// Get the total height of all the column's children
			column.getChildren().each(function(el){			

				if (el.hasClass('panel')){

					var currentInstance = instances.get(el.id);
					
					areAnyNextSiblingsExpanded = function(el){
						var test;
						el.getAllNext('.panel').each(function(sibling){
							var siblingInstance = instances.get(sibling.id);
							if (siblingInstance.isCollapsed == false) {
								test = true;
							}	
						}.bind(this));
						return test;
					}
										
					areAnyExpandedNextSiblingsExpanded = function(){
						var test;
						changing.getAllNext('.panel').each(function(sibling){
							var siblingInstance = instances.get(sibling.id);
							if (siblingInstance.isCollapsed == false) {
								test = true;
							}	
						}.bind(this));
						return test;
					}
					
					// Resize panels that are not collapsed or "new"
					if (action == 'new' ) {
						if (currentInstance.isCollapsed != true && el != changing) {
							panelsToResize.push(el);
						}
						
						// Height of panels that can be resized
						if (currentInstance.isCollapsed != true && el != changing) {
							this.panelsHeight += el.offsetHeight.toInt();
						}
					}
					// Resize panels that are not collapsed. If a panel is collapsing
					// resize any expanded panels below. If there are no expanded panels
					// below it, resize the expanded panels above it.
					else if (action == null || action == 'collapsing' ) {
						if (currentInstance.isCollapsed != true && (el.getAllNext('.panel').contains(changing) != true || areAnyNextSiblingsExpanded(el) != true)) {
							panelsToResize.push(el);
						}
						
						// Height of panels that can be resized
						if (currentInstance.isCollapsed != true && (el.getAllNext('.panel').contains(changing) != true || areAnyNextSiblingsExpanded(el) != true)) {
							this.panelsHeight += el.offsetHeight.toInt();
						}
					}
					// Resize panels that are not collapsed and are not expanding.
					// Resize any expanded panels below the expanding panel. If there are no expanded panels
					// below it, resize the first expanded panel above it.					
					else if (action == 'expanding') {
						   
						if (currentInstance.isCollapsed != true && (el.getAllNext('.panel').contains(changing) != true || (areAnyExpandedNextSiblingsExpanded() != true && el.getNext('.expanded') == changing)) && el != changing) {
							panelsToResize.push(el);
						}						
						// Height of panels that can be resized
						if (currentInstance.isCollapsed != true && (el.getAllNext('.panel').contains(changing) != true || (areAnyExpandedNextSiblingsExpanded() != true && el.getNext('.expanded') == changing)) && el != changing) {
							this.panelsHeight += el.offsetHeight.toInt();
						}				
					}
					
					if (el.style.height) {
						this.height += el.getStyle('height').toInt();
					}
					
					// Add children without height set and who are not collapsed to an array
					// THIS MAY NOT BE NEEDED				
					else if (currentInstance.isCollapsed != true) {
						heightNotSet.push(el);
					}	
				}
				else {
					this.height += el.offsetHeight.toInt();	
				}											
			}.bind(this));
		
			// Get the remaining height
			var remainingHeight = column.offsetHeight.toInt() - this.height;		
			
			// If any of the panels do not have their height set, i.e., on startup or a panel
			// was dynamically added ...				
			if (heightNotSet.length != 0) {				
				var heightToAdd = remainingHeight / heightNotSet.length;
				heightNotSet.each(function(panel){
					panel.setStyle('height', heightToAdd);
					var instances = MochaUI.Panels.instances;
					var contentEl = instances.get(panel.id).contentEl;
					contentEl.setStyle('height', newPanelHeight - contentEl.getStyle('padding-top').toInt() - contentEl.getStyle('padding-bottom').toInt());	
					contentEl.getChildren('iframe').setStyle('height', newPanelHeight - contentEl.getStyle('padding-top').toInt() - contentEl.getStyle('padding-bottom').toInt());						
				});
			}
			
			// If all the panels have their height set ...
			else {
				this.height = 0;				
				
				// Get height of all the column's children
				column.getChildren().each(function(el){
					this.height += el.offsetHeight.toInt();												
				}.bind(this));
				
				var remainingHeight = column.offsetHeight.toInt() - this.height;				
				
				// Todo: Need to check each panel. If it's height is less than zero we shouldn't
				// try to subtract more height from it. Instead the height should be subtracted
				// from panels with height greater than 0. This gets more complicated if the
				// panel has a height of 5 and we want to subtract 10px from it. We need to
				// subtract the five and split the difference to the other panels.
				//
				// Once a panel reaches 0 or there abouts the ratio is broken for returning to later.
								
				panelsToResize.each(function(panel){
					var ratio = this.panelsHeight / panel.offsetHeight.toInt();
					var newPanelHeight = panel.getStyle('height').toInt() + (remainingHeight / ratio);
					if (newPanelHeight < 1) {
						newPanelHeight = 0;
					}
					panel.setStyle('height', newPanelHeight);
				});	
			}
			
			// Make sure the remaining height is 0. If not add/subtract the
			// remaining height to the tallest panel. This makes up for browser resizing,
			// off ratios, and users trying to give panels too much height.
			
			// Get height of all the column's children
			this.height = 0;
			column.getChildren().each(function(el){
				this.height += el.offsetHeight.toInt();				
				if (el.hasClass('panel') && el.getStyle('height').toInt() > tallestPanelHeight) {
					tallestPanel = el;
					tallestPanelHeight = el.getStyle('height').toInt();
					
				}												
			}.bind(this));
				
			var remainingHeight = column.offsetHeight.toInt() - this.height;
						
			if ((remainingHeight > 0 || remainingHeight < 0) && tallestPanelHeight > 0) {
				tallestPanel.setStyle('height', tallestPanel.getStyle('height').toInt() + remainingHeight );
				if (tallestPanel.getStyle('height') < 1){
					tallestPanel.setStyle('height', 0 );
				}
			}			
			
			$$('.columnHandle').each(function(handle){
				handle.setStyle('height', handle.getParent().getStyle('height').toInt() - handle.getStyle('border-top').toInt() - handle.getStyle('border-bottom').toInt());
			});
			
			panelsExpanded.each(function(panel){
				resizeChildren(panel);
			});							
	}
	
	// May rename this resizeIframeEl()
	function resizeChildren(panel){
		var instances = MochaUI.Panels.instances;
		var currentInstance = instances.get(panel.id);
		var contentWrapperEl = currentInstance.contentWrapperEl;
				
		if (currentInstance.iframeEl) {
			currentInstance.iframeEl.setStyles({
				'height': contentWrapperEl.getStyle('height'),
				'width': contentWrapperEl.offsetWidth - contentWrapperEl.getStyle('border-left').toInt() - contentWrapperEl.getStyle('border-right').toInt()
			});
		}
	}
	
	
	// Remaining Width
	function rWidth(){	
		$$('.rWidth').each(function(column){
			var currentWidth = column.offsetWidth.toInt();
			currentWidth -= column.getStyle('border-left').toInt();		
			currentWidth -= column.getStyle('border-right').toInt();						
		
			var parent = column.getParent();		
			this.width = 0;
			
			// Get the total width of all the parent element's children
			parent.getChildren().each(function(el){
				if (el.hasClass('mocha') != true)
				this.width += el.offsetWidth.toInt();														
			}.bind(this));
		
			// Add the remaining width to the current element
			var remainingWidth = parent.offsetWidth.toInt() - this.width;
			var newWidth =	currentWidth + remainingWidth;	
			column.setStyle('width', newWidth);
			column.getChildren('.panel').each(function(panel){
				panel.setStyle('width', newWidth - panel.getStyle('border-left').toInt() - panel.getStyle('border-right').toInt());
				resizeChildren(panel);
			}.bind(this));				
		});
	}

function addResizeRight(element, min, max){
	if (!$(element)) return;
	element = $(element);
	
	var instances = MochaUI.Columns.instances;
	var currentInstance = instances.get(element.id);	
		
	var handle = element.getNext('.columnHandle');
	handle.setStyle('cursor', 'e-resize');	
	if (!min) min = 50;
	if (!max) max = 250;
	if (Browser.Engine.trident){	
		handle.addEvents({
			'mousedown': function(){
				handle.setCapture();
			},	
			'mouseup': function(){
				handle.releaseCapture();
			}
		});	
	}		
	currentInstance.resize = element.makeResizable({
		handle: handle,
		modifiers: {x: 'width', y: false},
		limit: { x: [min, max] },
		onStart: function(){
			element.getElements('iframe').setStyle('visibility','hidden');
			element.getNext('.column').getElements('iframe').setStyle('visibility','hidden');
		}.bind(this),							
		onDrag: function(){
			rWidth();
			if (Browser.Engine.trident4) {
				element.getChildren().each(function(el){
					var width = $(element).getStyle('width').toInt();
					width -= el.getStyle('border-right').toInt();
					width -= el.getStyle('border-left').toInt();
					width -= el.getStyle('padding-right').toInt();
					width -= el.getStyle('padding-left').toInt();
					el.setStyle('width', width);
				}.bind(this));
			}						
		}.bind(this),
		onComplete: function(){
			rWidth();
			element.getElements('iframe').setStyle('visibility','visible');
			element.getNext('.column').getElements('iframe').setStyle('visibility','visible');
			currentInstance.fireEvent('onResize');						
		}.bind(this)		
	});	
}

function addResizeLeft(element, min, max){
	if (!$(element)) return;
	element = $(element);
	
	var instances = MochaUI.Columns.instances;
	var currentInstance = instances.get(element.id);	
		
	var handle = element.getPrevious('.columnHandle');
	handle.setStyle('cursor', 'e-resize');
	var partner = element.getPrevious('.column');	
	if (!min) min = 50;
	if (!max) max = 250;
	if (Browser.Engine.trident){	
		handle.addEvents({
			'mousedown': function(){
				handle.setCapture();
			},	
			'mouseup': function(){
				handle.releaseCapture();
			}
		});	
	}		
	currentInstance.resize = element.makeResizable({
		handle: handle,
		modifiers: {x: 'width' , y: false},
		invert: true,
		limit: { x: [min, max] },
		onStart: function(){
			$(element).getElements('iframe').setStyle('visibility','hidden');
			partner.getElements('iframe').setStyle('visibility','hidden');
		}.bind(this),									
		onDrag: function(){	
			rWidth();	
		}.bind(this),
		onComplete: function(){
			rWidth();
			$(element).getElements('iframe').setStyle('visibility','visible');
			partner.getElements('iframe').setStyle('visibility','visible');
			currentInstance.fireEvent('onResize');						
		}.bind(this)		
	});
}


// May remove the ability to set min and max as an option

function addResizeBottom(element){
	if (!$(element)) return;
	var element = $(element);
	
	var instances = MochaUI.Panels.instances;
	var currentInstance = instances.get(element.id);	
	var handle = currentInstance.handleEl;
	
	handle.setStyle('cursor', 'n-resize');
	
	partner = currentInstance.partner;
		
	min = 0;
	max = function(){
		return element.getStyle('height').toInt() + partner.getStyle('height').toInt();
	}.bind(this)
	
	if (Browser.Engine.trident){	
		handle.addEvents({
			'mousedown': function(){
				handle.setCapture();
			},	
			'mouseup': function(){
				handle.releaseCapture();
			}
		});	
	}		
	currentInstance.resize = element.makeResizable({
		handle: handle,
		modifiers: {x: false, y: 'height'},
		limit: { y: [min, max] },
		invert: false,		
		onBeforeStart: function(){
			partner = currentInstance.partner;
			this.originalHeight = element.getStyle('height').toInt();
			this.partnerOriginalHeight = partner.getStyle('height').toInt();			
		}.bind(this),
		onStart: function(){
			if (currentInstance.iframeEl) {
				currentInstance.iframeEl.setStyle('visibility', 'hidden');
			}
			partner.getElements('iframe').setStyle('visibility','hidden');
		}.bind(this),							
		onDrag: function(){
			partnerHeight = partnerOriginalHeight + (this.originalHeight - element.getStyle('height').toInt());
			partner.setStyle('height', partnerHeight);
			resizeChildren(element, element.getStyle('height').toInt());
			resizeChildren(partner, partnerHeight);
		}.bind(this),
		onComplete: function(){
			partnerHeight = partnerOriginalHeight + (this.originalHeight - element.getStyle('height').toInt());
			partner.setStyle('height', partnerHeight);
			resizeChildren(element, element.getStyle('height').toInt());
			resizeChildren(partner, partnerHeight);
			if (currentInstance.iframeEl) {
				currentInstance.iframeEl.setStyle('visibility', 'visible');
			}	
			partner.getElements('iframe').setStyle('visibility','visible');
			currentInstance.fireEvent('onResize');			
		}.bind(this)		
	});
}
