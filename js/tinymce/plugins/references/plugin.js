/**
 * plugin.js
 *
 * Released under LGPL License.
 * Copyright (c) 2017 ETSI & FilLabs . All rights reserved
 */

/*global tinymce:true */
/*eslint no-nested-ternary:0 */

"use strict";

tinymce.PluginManager.add('references', function(editor, url) {

	var panel;
	var references = {};
	var rx = null;
        
        function rxhandler_ETSI(a){
        	return {
        		name : 'ETSI ' + a[1] + ' ' + a[2] + (a[3]?(' (V' + a[3] + ')'):''),
        		org: 'ETSI',
        		type: a[1],
        		reference: a[2],
        		version:a[3],
        		title : a[4] ? (a[4].replace(/^[:\s]+/u, '').trim()) : undefined
        	};
        }
        
        function rxhandler_IEEE(a){
        	return {
        		org: 'IEEE',
        		type: 'IEEE',
        		name : 'IEEE ' + a[1] ,
        		reference: a[1],
        		version:a[3],
        		title : a[4] ? (a[4].replace(/^[:\s]+/u, '').trim()) : undefined
        	};
        }

        function rxhandler_ISO(a){
        	return {
        		org: 'ISO',
        		type: 'ISO',
        		name : 'ISO/IEC ' + a[1] ,
        		reference: a[1],
        		version:a[2],
        		title : a[4] ? (a[4].replace(/^[:\s]+/u, '').trim()) : undefined
        	};
        }

        function complete_ETSI(a){
        	if(a.title === undefined || a.title.length == 0){
        		a.title = "To be requested...";
        		// TODO: Launch reference data request
        	}
        	// detect url
        	// TODO: it will be a real url
        	a.url = a.name.replace(/\s+/g, '_') + '.pdf';
        	return a;
        }
        function complete_IEEE(a){
        	if(a.title === undefined || a.title.length == 0){
        		a.title = "To be requested...";
        		// TODO: Launch reference data request
        	}
        	// TODO: it will be a real url
        	a.url = a.name.replace(/\s+/g, '_') + '.pdf';
        	return a;
        }

        function complete_ISO(a){
        	if(a.title === undefined || a.title.length == 0){
        		a.title = "To be requested...";
        		// TODO: Launch reference data request
        	}
        	// TODO: it will be a real url
        	a.url = a.name.replace(/\s+/g, '_') + '.pdf';
        	return a;
        }

        var rxs = [
         	{
         		rx: /(?:ETSI\s+)?(ETS)\s+(\d\d\d\s+\d\d\d(?:-\d+)?(?:-\d+)?)\s*(?:\([\.\dvV]+\))?/,
         		rxDetect: '(?:ETSI\\s+)?(?:ETS)\\s+\\d\\d\\d\\s+\\d\\d\\d(?:-\\d+)?(?:-\\d+)?\\s*(?:\\([vV\\d\\.]+\\))?',
         		handler:rxhandler_ETSI,
         		complete:complete_ETSI
         	},{
         		rx: /(?:ETSI\s+)?(SR|TR|TS|EG|ES|EN)\s+(\d\d\d\s+\d\d\d(?:-\d+)?(?:-\d+)?)\s*(?:[(-]+?[vV]?(\d+\.\d+\.\d+)\)?)?/,
         		rxDetect: '(?:ETSI\\s+)?(?:SR|TR|TS|EG|ES|EN)\\s+\\d\\d\\d\\s+\\d\\d\\d(?:-\\d+)?(?:-\\d+)?\\s*(?:-?\\(?(?:[vV]\\.?)?\\d+\\.\\d+\\.\\d+\\)?)?',
         		handler:rxhandler_ETSI,
         		complete:complete_ETSI
         	},{
         		rx: /(?:ETSI\s+)?(GR|GS)\s+([A-Z0-9]+(?:-[A-Z0-9]+)?\s+\d+(?:-\d+)?(?:-\d+)?)\s*(?:[(-vV]*(\d+\.\d+\.\d+)\)?)?/,
         		rxDetect: '(?:ETSI\\s+)?(?:GR|GS)\\s+[A-Z0-9]+(?:-[A-Z0-9]+)?\\s+\\d+(?:-\\d+)?(?:-\\d+)?\\s*(?:-?\\(?(?:[vV]\\.?)?\\d+\\.\\d+\\.\\d+\\)?)?',
         		handler:rxhandler_ETSI,
         		complete:complete_ETSI
         	},{
         		rx: /IEEE(?:\s+Std\.?)?\s+((\d+(?:\.\w+))(?:-(\w+))?)/,
         		rxDetect: 'IEEE(?:\\s+Std\\.?)?[\\s-]*\\d+(?:\\.\\w+)(?:-\\w+)?',
         		handler:rxhandler_IEEE,
         		complete:complete_IEEE
         	},{
         		rx: /ISO(?:\/IEC)?\s+([-\d]+)(?:\s+\((\d+)\))?/,
         		rxDetect: 'ISO(?:\\/IEC)?\\s+[-\d]+(?:\\s+\\(\d+\\))?',
         		handler:rxhandler_ISO,
         		complete:complete_ISO
         	}
        ];

	var inlineOptions = {
		name: 'references',
		processTextNode: processTextNode
	};

	// load CSS
	tinymce.DOM.styleSheetLoader.load(url + '/css/refpanel.css');

	editor.on('init', function() {
		if (editor.settings.refpanel_show_on_start) {
			editor.execCommand('mceShowRefPanel');
		}
	});

	editor.fire('mceInlineRegister', inlineOptions);
	
	editor.on('mceInlineSetContent', function() {
		var dom = editor.dom, doc = editor.dom.doc;

		references   = {};

		// load from reference section
		var refSections = dom.select('#references');
		var refSections = dom.select('section:has(h1:contains("References"))');
		if (refSections.length) {
			for(var s=0; s<refSections.length; s++) {
				var list = dom.select('p,li', refSections[s]);
				for (var l = 0; l < list.length; l++) {
					var x = list[l].textContent;
					x = x.split(/^(?:\[((i\.)?\d+)\])\s*(.*)/gmu);
					if( x.length > 1) { // id ref title
						for(var i=0; i<rxs.length; i++) {
							var a = x[3].split(rxs[i].rx);
							if(a.length > 1){
								var ref = rxs[i].handler(a);
								ref.id = x[1];
								ref.informative = (x[2] != undefined);
								ref = rxs[i].complete(ref);
								references[ref.reference] = ref;
								break;
							}
						}
					}

				}

			}
//			dom.$(refSections).remove();
		}
		// prepare reference rx
		rx = '('+rxs[0].rxDetect+')';
		for(var i=1, l=rxs.length; i<l; i++) {
			rx += '|('+rxs[i].rxDetect+')';
		}
		rx = new RegExp(rx, 'gmu');
	});

	function processTextNode(editor, txt) {
		var dom = editor.dom, doc = editor.dom.doc;
		var df = null;

		// if parrent node is a <a class='reference'> then skip it
		if(txt.parentNode.tagName === 'CITE') {
			return null;
		}

		var subtxt = txt.data.split(rx);
		if (subtxt.length === 1) {
			return null;
		}

		var df = doc.createDocumentFragment();
		df.appendChild(doc.createTextNode(subtxt.shift()));
		while (subtxt.length) {

			// next rxs.length items in array corresponds to matching against each rxs 
			for (var i = 0; i < rxs.length; i++) {
				var m = subtxt.shift();
				if(m !== undefined) {
					// parse data
					var a = m.match(rxs[i].rx);
					if(a && a.length > 1){
						a = rxs[i].handler(a);
						var ref = references[a.reference];
						if(ref === undefined){
							ref = rxs[i].complete(a);
							references[ref.reference] = ref;
						}
						dom.add(df, 'a', { 
							class:'reference',
							href: ref.url
						}, '<cite title="'+ref.title+'" name="' + ref.name.replace(/\s+/,'_') + '">'+ref.name+'</cite>' );
					} 
				}
			}
			df.appendChild(doc.createTextNode(subtxt.shift()));
		}
		return df;
	}

	editor.addCommand('mceShowRefPanel', function () {
		var dom = editor.dom;
		if (panel) {
			// hide nav panel
			editor.fire('DeleteSidePanel', {item: panel});
			panel = null;
		} else {
			panel = tinymce.ui.Factory.create(
				{type: 'control', name: 'ref-panel', classes: 'ref-panel', title: 'References'}
			);
			editor.fire('AddSidePanel', {item: panel, side: 'left'});

			var ul = dom.doc.createElement('ul');

			tinymce.each(references, function(ref) {
				var li = editor.dom.doc.createElement('li');
                                var a = dom.add(li, 'cite', {title: ref.title}, ref.name);
                                if(ref.informative) {
                                	dom.add(li, 'span', {'class': 'informative'}, '[Informative]');
                                }
//                                li.appendChild(dom.doc.createTextNode(ref.title));

                                function highlight(name){
                                	dom.$('style#ref-highlight').remove();
                                	if(name && name.length){
                                		dom.$('head').append('<style id="ref-highlight">cite[name="'+name+'"]{background-color:yellow;}</style>');
                                	}
                                }

                                li.addEventListener('click', function(ev){
                                	highlight(dom.$('cite', this)[0].textContent.trim().replace(/\s+/, '_'));
                                	dom.$('li.current',this.parentNode).removeClass('current');
                                	this.classList.add('current');
					editor.focus();
                                });

                               	ul.appendChild(li);
			});
			panel.getEl().appendChild(ul);
		}
		editor.focus();
		editor.fire('RefPanelStateChanged', {state: panel ? true : false});
		function allignPanel() {
			var alist = dom.$('cite', ul);
			var width = 0;
			tinymce.each(alist, function(a){
				if(width < a.offsetWidth) {
					width = a.offsetWidth;
				}
			});
			alist.css('width', width+'px');
		}
		allignPanel();
	});

	editor.addMenuItem('refPanel', {
		text: 'References',
		selectable: true,
		cmd: 'mceShowRefPanel',
		onPostRender: function() {
			var self = this;
			self.active(panel ? true : false);
			editor.on('RefPanelStateChanged', function(e) {
				self.active(e.state);
			});
		},
		context: 'view'
	});
	return {};

}, ['inlines','sidepanel']);