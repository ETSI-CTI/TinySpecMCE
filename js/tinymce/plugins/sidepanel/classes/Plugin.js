/**
 * plugin.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2015 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

/*global tinymce:true */
/*eslint no-nested-ternary:0 */

define("tinymce/plugins/sidepanel/Plugin", [
	"tinymce/ui/SidePanelHeader",
	"tinymce/dom/DomQuery",
	"tinymce/dom/DOMUtils"
], function(SidePanelHeader, $, DOMUtils) {

var getElementSize = function(elm) {
	var width, height;

	if (elm.getBoundingClientRect) {
		var rect = elm.getBoundingClientRect();

		width = Math.max(rect.width || (rect.right - rect.left), elm.offsetWidth);
		height = Math.max(rect.height || (rect.bottom - rect.bottom), elm.offsetHeight);
	} else {
		width = elm.offsetWidth;
		height = elm.offsetHeight;
	}

	return {width: width, height: height};
};

tinymce.PluginManager.add('sidepanel', function(editor, url) {
	var settings = editor.settings;
	var self = this;
	var panels = {};
	var container;
	var area; 

	// We don't support older browsers like IE6/7 and they don't provide prototypes for DOM objects
	if (!window.NodeList) return;

	// load CSS
	tinymce.DOM.styleSheetLoader.load(url + '/css/sidepanel.css');

	// Prepare left and right pannels. Hide it as no pannel will be shown by default
	editor.on("BeforeRenderUI", function() {
		var theme = editor.theme;
		container = theme.panel;

		// rearrange elements in panel items
		container.items().each(function(p){
			if(p.name() === 'iframe'){
				var n = tinymce.ui.Factory.create(
					{type: 'container', name: 'panels-container', style:'position:relative;',layout: 'stack', items: [
						p,
						{type: 'container', name: 'left-panel-container', classes: 'side-panel-container left', laytout:'stack', width:100, hidden:true, items:[
							{type: 'sidepanelheader', name: 'left-panel', layout:'stack', classes:'tabpanel'},
							{type: 'control', name: 'panel-handler', layout: 'stack', classes: 'resize-handler', html:''},
						]},
						{type: 'container', name: 'right-panel-container', classes: 'side-panel-container right', laytout:'stack', width:100, hidden:true, items:[
							{type: 'sidepanelheader', name: 'right-panel', layout: 'stack', classes:'tabpanel'},
							{type: 'control', name: 'panel-handler', layout: 'stack', classes: 'resize-handler', html:''}
						]}
					]}
				);
				container.replace(p, n);
				area = p;
			}
		});
		panels['left']  = container.find('#left-panel')[0];
		panels['right'] = container.find('#right-panel')[0];

		var rhandlers = container.find('#panel-handler');
		rhandlers.on('postrender', function(e){
			var h    = e.control;
			var cntr = h.parent();
			var side;

			side = 'left';
			if(!cntr._name.startsWith(side)){
				side = 'right';
				if(!cntr._name.startsWith(side)){
					return;
				}
			}
			
			h.resizeDragHelper = new tinymce.ui.DragHelper(h._id, {
				start: function() {
					h.resizeDragHelper.startDragW = getElementSize(cntr.getEl()).width;
				},
				drag: function(e) {
					var w, maxWidth, minWidth;
					var side = h.resizeDragHelper.side;
					maxWidth = parseInt(DOMUtils.DOM.getStyle(cntr.getEl(),'max-width', true), 10) || cntr.parent().layoutRect().w;
					minWidth = parseInt(DOMUtils.DOM.getStyle(cntr.getEl(),'min-width', true), 10) || 0;
					w = h.resizeDragHelper.startDragW + e.deltaX;
					if(w < maxWidth && w > minWidth) {
						DOMUtils.DOM.setStyle(cntr.getEl(), 'width', w + 'px');
						DOMUtils.DOM.setStyle(area.getEl(),'margin-'+side, w + 'px');
					}
				},
				stop: function() {}
			});
			h.resizeDragHelper.side = side;
		});
	}); // BeforeRenderUI

	editor.on("AddSidePanel", function(args) {
		var side, panel, cntr;
		side  = (args['side'] && args['side'] == 'right') ? 'right' : 'left';
		panel = args['panel'] || args['item'];
		panel.classes.add('side-panel');

		panels[side].append(panel).reflow();

		// hack to add tabpanel header
		var header = panels[side].getEl('head');
		var h = DOMUtils.DOM.createFragment(panels[side].renderHtml()).firstChild.firstChild;
		if(h.id == header.id){
			header.innerHTML = h.innerHTML;
		}
		panels[side].activateTab(panels[side].items().length-1);

		cntr = panels[side].parent();
		if(!cntr.visible()){
			cntr.show();
			var w = cntr.layoutRect().w;
			DOMUtils.DOM.setStyle(area.getEl(),'margin-'+side, w + 'px');
		}
	});//AddSidePanel
	
	editor.on("DeleteSidePanel", function(args) {
		var name, panel, side;
		if(args['name']) name = args.name;
		else if(args['panel']){
			name = args.panel.name();
		}else if(args['item']){
			name = args.item.name();
		}else return;

		side = 'left';
		panel = panels[side].find('#'+name)[0];
		if(!panel) {
			side = 'right';
			panel = panels[side].find('#'+name)[0];
			if(!panel) return;
		}
		panel.remove();
		if(panels[side].items().length == 0){
			panels[side].parent().hide();
			DOMUtils.DOM.setStyle(area.getEl(),'margin-'+side, '0px');
		}
	});//DeleteSidePanel
}); // tinymce.PluginManager.add
}); // define