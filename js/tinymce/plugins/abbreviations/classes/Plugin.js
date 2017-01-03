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
	var abbrMap;
	var abbrVariants = {};

	// load CSS
	tinymce.DOM.styleSheetLoader.load(url + '/css/abbrpanel.css');

	editor.on('init', function() {
		if (editor.settings.abbrpanel_show_on_start) {
			editor.execCommand('mceShowAbbrPanel');
		}
	});

	editor.on('SetContent', function() {
		var list, dom = editor.dom, doc = editor.dom.doc;

		var acroMap = {};
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
		}

		list = Object.keys(abbrMap);
                var abbrRx = list.length ? "(?:\\b" + list.join("\\b)|(?:\\b") + "\\b)" : null;

		// go throw all text nodes
		function allTextNodes(element, exclusions) {
			var textNodes = [],
			excl = {};
			for (var i = 0, n = exclusions.length; i < n; i++) {
				excl[exclusions[i]] = true;
			}
			function getTextNodes(node) {
      				if (node.nodeType === 1 && excl[node.localName.toLowerCase()]) {
      					return;
      				}
      				if (node.nodeType === 3) {
      					textNodes.push(node);
      				} else {
        				for (var i = 0, len = node.childNodes.length; i < len; ++i) {
        					getTextNodes(node.childNodes[i]);
        				}
        			}
        		}
			getTextNodes(element);
			return textNodes;
		};

		var txts = allTextNodes(dom.select('body')[0], ["pre"]);

		var rx = new RegExp(	"(\\bMUST(?:\\s+NOT)?\\b|\\bSHOULD(?:\\s+NOT)?\\b|\\bSHALL(?:\\s+NOT)?\\b|" +
					"\\bMAY\\b|\\b(?:NOT\\s+)?REQUIRED\\b|\\b(?:NOT\\s+)?RECOMMENDED\\b|\\bOPTIONAL\\b|" +
					"(?:\\[\\[(?:!|\\\\)?[A-Za-z0-9\\.-]+\\]\\])" + ( abbrRx ? "|" + abbrRx : "") + ")");

		for (var i = 0; i < txts.length; i++) {
			var txt = txts[i];
			var subtxt = txt.data.split(rx);
			if (subtxt.length === 1) {
				 continue;
			}

			var df = doc.createDocumentFragment();
			while (subtxt.length) {
				var t = subtxt.shift();
				var matched = null;
				if (subtxt.length) matched = subtxt.shift();
				df.appendChild(doc.createTextNode(t));
                        	if (matched) {
					// RFC 2119
					if (/MUST(?:\s+NOT)?|SHOULD(?:\s+NOT)?|SHALL(?:\s+NOT)?|MAY|(?:NOT\s+)?REQUIRED|(?:NOT\s+)?RECOMMENDED|OPTIONAL/.test(matched)) {
                                		matched = matched.split(/\s+/).join(" ");
						dom.add(df, 'em', { "class": "rfc2119", title: matched }, matched);
                            		}
					// BIBREF
					else if (/^\[\[/.test(matched)) {
						var ref = matched;
						ref = ref.replace(/^\[\[/, "");
						ref = ref.replace(/\]\]$/, "");
						if (ref.indexOf("\\") === 0) {
        						df.appendChild(doc.createTextNode("[[" + ref.replace(/^\\/, "") + "]]"));
						} else {
							var norm = false;
							if (ref.indexOf("!") === 0) {
                                            			norm = true;
								ref = ref.replace(/^!/, "");
							}
							// contrary to before, we always insert the link
							df.appendChild(doc.createTextNode("["));
							dom.add(dom.add(df, 'cite'), 'a', {"class": "bibref", href: "#bib-" + ref}, ref );
							df.appendChild(doc.createTextNode("]"));
						}
					}
					// ACRONYM
					else if (acroMap[matched]) {
						if (dom.getParent(txt, "acronym")) {
							df.appendChild(doc.createTextNode(matched));
						} else {
							dom.add(df, 'abbr', {title: abbrMap[matched]}, matched );
						}
					}
					// ABBR
					else if (abbrMap[matched]) {
						if (dom.getParent(txt, "abbr")) {
							df.appendChild(doc.createTextNode(matched));
						} else {
							dom.add(df, 'abbr', {title: abbrMap[matched]}, matched );
						}
					}
					// FAIL -- not sure that this can really happen
					else {
					}
				}
			}
			txt.parentNode.replaceChild(df, txt);
		}
	});

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
			tinymce.each(abbrMap, function(title, abbr) {
				var li = editor.dom.doc.createElement('li');
                                var a = dom.add(li, 'abbr', {title: title}, abbr);
                                li.appendChild(dom.doc.createTextNode(title));
                                li.addEventListener('dblclick', function(ev){
                                	var li = this;
                                	var a = dom.$('abbr', li)[0];
                                	var abbr = a.textContent;
                                	var title = a.title;
                               		var onSubmit = function(title) {
                               			a.title = title;
                               			li.removeChild(a.nextSibling);
                               			li.appendChild(dom.doc.createTextNode(title));
                               			var variants = abbrVariants[abbr];
                               			if (!variants) {
                               				variants = abbrVariants[abbr] = [title];
                               			} else {
                               				variants.push(title);
                               			}
                               		};
                               		var showDialog = function () {
						var win = editor.windowManager.open ({
							layout: "stack",
							pack: "center",
							align: "center",
							onClose: function() {
								editor.focus();
							},
							onSubmit: function() {
								editor.focus();
								var title = win.find('#abbr')
								onSubmit(title);
							},
							title: "Abbreviation: " + a.textContent,
							padding: 20,
							labelGap: 30,
							spacing: 4,
							items: [
								{type: 'combobox', name: 'abbr', label: a.textContent, value: a.title, menu: wmenu}
							]
						});
					};

					var wmenu = abbrVariants[abbr];
                                	if (wmenu) {
                                		showDialog(abbr, title, wmenu, onSubmit);
                                	} else {
                                		// send request for the list of variants
                                		requestAbbrVariants(abbr, function(variants){
                                			if(variants && variants.length){
	                                			wmenu = [];
                                				for (var i, l = variants.length; i < l; i++) {
                                					wmenu.push({text:variants[i], value:variants[i]});
                                				}
	                                			abbrVariants[abbr] = wmenu;
                                			}
	                                		showDialog(abbr, title, wmenu, onSubmit);
                                		});
                                	}
                                });
                                ul.appendChild(li);
			});
			panel.getEl().appendChild(ul);
		}
		editor.focus();
		editor.fire('AbbrPanelStateChanged', {state: panel ? true : false});
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
	return {};

}, ['sidepanel']);