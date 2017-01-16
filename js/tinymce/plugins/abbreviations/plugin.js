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

"use strict";

tinymce.PluginManager.add('abbreviations', function(editor, url) {

	var panel;
	var acroMap, abbrMap;
	var abbrVariants = {};
	var abbrRx = null;

	var inlineOptions = {
		name: 'abbreviations',
		processTextNode: processTextNode
	};

	// load CSS
	tinymce.DOM.styleSheetLoader.load(url + '/css/abbrpanel.css');

	editor.on('init', function() {
		if (editor.settings.abbrpanel_show_on_start) {
			editor.execCommand('mceShowAbbrPanel');
		}
	});

	editor.fire('mceInlineRegister', inlineOptions);
	
	editor.on('mceInlineSetContent', function() {
		var list, dom = editor.dom, doc = editor.dom.doc;

		acroMap = {};
		abbrMap = {};

                // load all abbreviations and acronyms from text
		list = dom.select("acronym[title]");
		for (var i = 0, l = list.length; i < l; i++) {
			if (list[i].title) {
				acroMap[list[i].textContent.trim()] = list[i].title.trim();
				abbrMap[list[i].textContent.trim()] = list[i].title.trim();
			}
		}
		list = dom.select("abbr[title]");
		for (var i = 0, l = list.length; i < l; i++) {
			if (list[i].title) {
				abbrMap[list[i].textContent.trim()] = list[i].title.trim();
			}
		}

		// load from abbreviations 
		var abbrSection = dom.select('#abbreviations')[0];
		if (abbrSection) {
			list = dom.select('p,li', abbrSection);
			for (var i = 0, l = list.length; i < l; i++) {
				var abbr, title;
				var t = list[i].textContent;
				abbr = t.indexOf('\xa0'); // &nbsp;
				if(abbr == -1) {
					abbr = t.search(/\s/);
				}
				if (abbr > 0) {
					title = t.substring(abbr).trim();
					abbr = t.substring(0, abbr);
					abbrMap[abbr] = title;
				}
			}
			dom.$(abbrSection).remove();
		}
		var list = Object.keys(abbrMap);
		if (list.length) {
			abbrRx = "((?:\\b" + list.join("\\b)|(?:\\b") + "\\b))";
			abbrRx = new RegExp(abbrRx);
		}else{
			abbrRx = null;
		}
	});

	function processTextNode(editor, txt) {
		var dom = editor.dom, doc = editor.dom.doc;

		if(abbrRx === null) {
			return null;
		}
		var subtxt = txt.data.split(abbrRx);
		if (subtxt.length === 1) {
			return null;
		}

		var df = doc.createDocumentFragment();
		while (subtxt.length) {
			var t = subtxt.shift();
			var matched = null;
			if (subtxt.length) matched = subtxt.shift();
			df.appendChild(doc.createTextNode(t));
                        if (matched) {
				// ACRONYM
				if (acroMap[matched]) {
					if (dom.getParent(txt, "acronym")) {
						df.appendChild(doc.createTextNode(matched));
					} else {
						dom.add(df, 'abbr', { name: matched.replace(/\s+/,'_'), title: abbrMap[matched]}, matched );
					}
				}
				// ABBR
				else if (abbrMap[matched]) {
					if (dom.getParent(txt, "abbr")) {
						df.appendChild(doc.createTextNode(matched));
					} else {
						dom.add(df, 'abbr', {name: matched.replace(/\s+/,'_'), title: abbrMap[matched]}, matched );
					}
				}
				// FAIL -- not sure that this can really happen
				else {
				}
			}
		}
		return df;
	}

	var createPanelItem = function(abbr, title) {
		var dom = editor.dom;
		var li = dom.doc.createElement('li');
		var a = dom.add(li, 'abbr', {title: title}, abbr);
		li.appendChild(dom.doc.createTextNode(title));
		li.addEventListener('dblclick', function(ev){
			var li = this;
			var a = dom.$('abbr', li)[0];
                        var abbr = a.textContent.trim();
                        var title = a.title;
                       	var saveAbbrTitle = function(title) {
				a.title = title;
				li.removeChild(a.nextSibling);
				li.appendChild(dom.doc.createTextNode(title));
                       		var variants = abbrVariants[abbr];
                       		if (!variants) {
                       			variants = abbrVariants[abbr] = [title];
                       		} else {
                       			var i=0, l = variants.length;
                       			// insert in alphabetic order
                       			for(; i < l; i++) {
                       				if(variants[i] < title) continue;
                       				if(variants[i] > title) {
                       					variants.splice(i, 0, title);
                       				}
                       				break;
                       			}
                       			if (i == l) {
                       				variants.push(title);
                       			}
                       		}
                       		dom.$('abbr[name="'+ abbr.replace(/\s+/, '_')+'"]').attr('title',title);
                       	};
                       	var showDialog = function (abbr, title, variants, submitCb) {
                        	var wmenu = [];
                        	if(variants && variants.length){
                        		for (var i=0, l = variants.length; i < l; i++) {
                        			wmenu.push({text:variants[i], value:variants[i]});
                        		}
                        	}
                        	var win = editor.windowManager.open ({
					layout: "flex",
					pack: "center",
					align: "center",
					onClose: function() {
						editor.focus();
					},
					onSubmit: function() {
						editor.focus();
						var aw = win.find('#abbr');
						if(aw.length) {
							saveAbbrTitle(aw[0].value());
						}
					},
					title: "Abbreviation: " + abbr,
					width: 600,
					items: {
						type: "form",
						padding: 20,
						labelGap: 20,
						spacing: 4,
						items: [
							{type: 'combobox', name: 'abbr', label: abbr, value: title, menu: wmenu}
						]
					}
				});
			};
				
			var requestAbbrVariants = function (abbr, cb) {
				//TODO: add XHR
				cb([
					'Abbreviation meaning 1',
					'Abbreviation meaning 2',
				]);
			};

			var variants = abbrVariants[abbr];
                        if (variants) {
                        	showDialog(abbr, title, variants);
                        } else {
                        	// send request for the list of variants
                        	requestAbbrVariants(abbr, function(variants){
                        		abbrVariants[abbr] = variants;
                               		showDialog(abbr, title, variants);
                        	});
                        }
		});
		function highlightAbbr(name){
			dom.$('style#abbr-highlight').remove();
                        if(name && name.length){
                        	dom.$('head').append('<style id="abbr-highlight">abbr[name="'+name+'"]{background-color:yellow;}</style>');
                        }
		}
		li.addEventListener('click', function(ev){
                        highlightAbbr(dom.$('abbr', this)[0].textContent.trim().replace(/\s+/, '_'));
                        dom.$('li.current',this.parentNode).removeClass('current');
                        this.classList.add('current');
			editor.focus();
		});
		return li;
	}
	function allignAbbrPanel() {
        	var dom = editor.dom;
        	if(panel) {
			var alist = dom.$('abbr', panel.getEl());
			var width = 0;
			for(var i=0; i<alist.length; i++) {
				if(width < alist[i].offsetWidth) {
					width = alist[i].offsetWidth;
				}
			}
			if(width > 0) {
				alist.css('width', width+'px');
			}
		}
	}

	editor.addCommand('mceShowAbbrPanel', function () {
		var dom = editor.dom;

		if (panel) {
			// hide nav panel
			editor.fire('DeleteSidePanel', {item: panel});
			panel = null;
		} else {
			panel = tinymce.ui.Factory.create(
				{type: 'control', name: 'abbr-panel', classes: 'abbr-panel', title: 'Abbreviations'}
			);
			editor.fire('AddSidePanel', {item: panel, side: 'left'});

			var ul = dom.doc.createElement('ul');
			var abbrs = Object.keys(abbrMap).sort();

			tinymce.each(abbrs, function(abbr) {
				var title = abbrMap[abbr];
				var li = createPanelItem(abbr, title);
                                ul.appendChild(li);
			});
			panel.getEl().appendChild(ul);
		}
		editor.focus();
		editor.fire('AbbrPanelStateChanged', {state: panel ? true : false});
		allignAbbrPanel();
	});

	editor.addMenuItem('abbrPanel', {
		text: 'Abbreviations',
		selectable: true,
		cmd: 'mceShowAbbrPanel',
		onPostRender: function() {
			var self = this;
			self.active(panel ? true : false);
			editor.on('AbbrPanelStateChanged', function(e) {
				self.active(e.state);
			});
		},
		context: 'view'
	});

	editor.addButton('abbreviation', {
		title: 'Abbreviation',
		icon: 'forecolor',
		cmd: 'mceMakeAbbreviation'
	});
	editor.addCommand('mceMakeAbbreviation', function () {
		var dom = editor.dom, doc = editor.dom.doc;
		var rng = editor.selection.getRng();
		if(rng.startContainer == rng.endContainer){
			if (rng.startContainer.parentNode.tagName != 'ABBR'){
				// create abbreviation
				var txt = rng.startContainer.textContent;
				var abbr = txt.substring(rng.startOffset, rng.endOffset).replace(/^\s+/,''); // trim left
				var startOffset = rng.endOffset - abbr.length;
				abbr = abbr.trim();
				var endOffset = startOffset + abbr.length;
				var df = dom.createFragment(
					txt.substring(0, startOffset) +
					'<abbr title="" name="' + abbr.replace(/\s+/, '_') + '">' + abbr + '</abbr>' + txt.substr(endOffset));
				rng.startContainer.parentNode.replaceChild(df, rng.startContainer);
				// TODO: fix selection

			        abbrMap[abbr] = '';

			        if(panel){
	       				var li = createPanelItem(abbr, '');
	       				var items = panel.$('abbr', panel.getEl());
	       				var i;
	       				for (i=0; i<items.length; i++) {
	       					var t = items[i].textContent.trim();
	       					if(abbr.toLowerCase() < t.toLowerCase()){
	       						break;
	       					}
	       				}
	       				if(i < items.length){
      						var b = items[i].parentNode;
      						b.parentNode.insertBefore(li, b);
					}else{
						var ul = panel.$('ul', panel.getEl())[0];
						ul.appendChild(li);
					}
					allignAbbrPanel();
	       			}
			}
		}
	});

	return {};

}, ['inlines','sidepanel']);