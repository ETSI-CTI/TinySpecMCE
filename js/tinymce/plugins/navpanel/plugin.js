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

var isHeaderNode = function(el) {
	return ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].indexOf(el.nodeName.toLowerCase()) >= 0;
};

var subHeaderNode = function(el) {
	for (var e = el.lastChild; e; e = e.previousSibling) {
		var s = subHeaderNode(e);
		if (s) {
			return s;
		}
		if (isHeaderNode(e)) {
			return e;
		}
	}
	return null;
};

var previousHeaderNode = function(el) {
	var e = el.previousSibling;
	while (e) {
		var s = subHeaderNode(e);
		if (s) {
			return s;
		}
		if (isHeaderNode(e)) {
			return e;
		}
		e = e.previousSibling;
	}
	if (el.parentNode && el.parentNode.nodeName.toLowerCase() != 'body') {
		if (isHeaderNode(el.parentNode)) {
			return el.parentNode;
		}
		e = previousHeaderNode(el.parentNode);
	}
	return null;
};

var NavTree = function(tinymce, editor) {

	var toc = document.createElement('ul');
	var selectedTocItem = null;

	var forEachTocItem = function(cb, data) {
		if (toc) {
			for (var i = toc.firstChild; i; i = i.nextSibling) {
				if (i.nodeType == Node.ELEMENT_NODE) {
					if (cb(i, data)) {
						return i;
					}
				}
			}
		}
		return null;
	};

	var tocItemById = function(id) {
		return forEachTocItem(function(el) {
			return el.id == id ? el : null;
		});
	};

	var tocItemByElement = this.tocItemByElement = function(el) {
		if (typeof (el) == 'string') {
			// search by id
			return tocItemById('toc-' + el);
		}
		if (el.id && el.id.startsWith('hdr-')) {
			return tocItemById('toc-' + el.id);
		}
		return null;
	};

	var elementByTocItem = this.elementByTocItem = function(ti) {
		return editor.dom.get(ti.id.substr(4));
	};

	this.onHeaderElementSelected = function(el) {
		var tocItem = this.tocItemByElement(el);
		if (tocItem) {
			selectTocItem(tocItem);
		}
	};

	var selectTocItem = this.selectTocItem = function(tocItem) {
		if (selectedTocItem) {
			selectedTocItem.classList.remove('current');
		}
		tocItem.classList.add('current');
		selectedTocItem = tocItem;
	};

	var _on_item_click = function(ev) {
		var tocItem = ev.target;
		if (tocItem) {
			var el = elementByTocItem(tocItem);
			if (el) {
				el.scrollIntoView();
				editor.selection.setCursorLocation(el, 0);
				editor.focus();
			} else {
				// no element with this id.
				toc.removeChild(tocItem);
			}
			selectTocItem(tocItem);
		}
	};

	var createTocItem = function(el) {
		var tocItem;
		if (!el.id || !el.id.startsWith('hdr-')) {
			el.id = 'hdr-' + Math.random().toString(36).substring(2, 15);
		}
		tocItem = tocItemById(el.id);
		if (!tocItem) {
			tocItem = document.createElement("li");
			tocItem.id = 'toc-' + el.id;
			tocItem.className = 'toc-' + el.nodeName.toLowerCase();
			tocItem.level = parseInt(el.nodeName.substr(1), 10);
			tocItem.addEventListener('click', _on_item_click);
		}
		tocItem.textContent = el.textContent;
		return tocItem;
	};

	/* remove old toc and create a new one */
	this.setContent = function(dom) {
		var i, l;
		var headers = dom.select('h1,h2,h3,h4,h5,h6');
		var tocRoot = document.createElement('ul');
		for (i = 0, l = headers.length; i < l; i++) {
			var el = headers[i];
			var tocItem = createTocItem(el);
			if (tocItem.parentNode) {
				tocItem = tocItem.parentNode.removeChild(tocItem);
			}
			tocRoot.appendChild(tocItem);
		}
		this.toc = toc = tocRoot;
		return tocRoot;
	};

	this.updateTocItem = function(tocItem, el) {
		tocItem.className = tocItem.className.replace(/toc-h\w*\s*/i, '') + ' ' + 'toc-' + el.nodeName.toLowerCase();
		tocItem.level = parseInt(el.nodeName.substr(1), 10);
		tocItem.textContent = el.textContent;
	};

	this.insertTocItemForElement = function(el) {
		var tocItem = createTocItem(el);
		if (!tocItem.parentNode) {
			var h = previousHeaderNode(el);
			if (h) {
				h = tocItemByElement(h);
			}
			if (h) {
				h = h.nextSibling;
			} else {
				h = toc.firstChild;
			}
			if (h) {
				tocItem = toc.insertBefore(tocItem, h);
			} else {
				tocItem = toc.appendChild(tocItem);
			}
		}
	};

	this.removeTocItem = function(tocItem) {
		var el = elementByTocItem(tocItem);
		if (el) {
			if (el.id && el.id.startsWith('hdr-')) {
				el.id = undefined;
			}
		}
		toc.removeChild(tocItem);
	};

	var updateTimerId = false;
	var updateElements = {};
	var performUpdate = function(tree) {
		updateTimerId = false;
		for (var id in updateElements) {
			var el = editor.dom.get(id);
			var ti;
			if (el) {
				ti = tree.tocItemByElement(el);
				if (ti) {
					tree.updateTocItem(ti, el);
					// check that next tockItem is also valid
					// This is a workaround for strange deletion of headers in tinyMCE
					ti = ti.nextSibling;
					while (ti) {
						el = elementByTocItem(ti);
						if (!el) {
							var next = ti.nextSibling;
							toc.removeChild(ti);
							ti = next;
						} else {
							break;
						}
					}
				}
			} else {
				ti = tree.tocItemById('toc-' + id);
				if (ti) {
					toc.removeChild(ti);
				}
			}
		}
		updateElements = {};
	};

	this.setupTocUpdate = function(el) {
		if (el.id && el.id.startsWith('hdr-')) {
			if (updateTimerId) {
				clearTimeout(updateTimerId);
				updateTimerId = false;
			}
			updateElements[el.id] = true;
			updateTimerId = setTimeout(performUpdate, 200, this);
		}
	};
};

tinymce.PluginManager.add('navpanel', function(editor, url) {

	var navTree;
	var navPanel;

	// load CSS
	tinymce.DOM.styleSheetLoader.load(url + '/css/navpanel.css');

	navTree = new NavTree(tinymce, editor);

	editor.on('init', function() {
		if (editor.settings.navpanel_show_on_start) {
			editor.execCommand('mceShowNavPanel');
		}
	});

	editor.on('SetContent', function() {
		var oldToc = navTree.toc;
		navTree.setContent(editor.dom);
		if (navPanel) {
			var n = navPanel.getEl();
			if (n) {
				n.removeChild(oldToc);
				n.appendChild(navTree.toc);
			}
		}
	});

	// raised when user changed the current node
	editor.on('nodeChange', function(ev) {
		if (ev.selectionChange) {
			var el = ev.element;
			var tocItem;
			// check that header is this or parent
			if (!isHeaderNode(el)) {
				tocItem = navTree.tocItemByElement(el);
				if (tocItem) {
					navTree.removeTocItem(tocItem);
				}
				el = previousHeaderNode(el);
			} else {
				tocItem = navTree.tocItemByElement(el);
				if (tocItem) {
					navTree.updateTocItem(tocItem, el);
				} else {
					tocItem = navTree.insertTocItemForElement(el);
				}
			}
			if (el) {
				navTree.onHeaderElementSelected(el);
			}
		}
	});

	editor.on('selectionchange', function() {
		var el = editor.dom.getParent(editor.selection.getNode(), isHeaderNode);
		if (el) {
			navTree.setupTocUpdate(el);
		}
	});

	editor.on('keyup', function(ev) {
		if (ev.keyCode == 46) { // Delete
			if (!ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
				var el = editor.dom.getParent(editor.selection.getNode(), isHeaderNode);
				if (el) {
					navTree.setupTocUpdate(el);
				}
			}
		}
	});


	editor.addCommand('mceShowNavPanel', function () {
		if (navPanel) {
			// hide nav panel
			editor.fire('DeleteSidePanel', {item: navPanel});
			navPanel = null;
		} else {
			navPanel = tinymce.ui.Factory.create(
				{type: 'control', name: 'nav-panel', classes: 'nav-panel', title: 'Table of Contents'}
			);
			editor.fire('AddSidePanel', {item: navPanel, side: 'left'});
			navPanel.getEl().appendChild(navTree.toc);
		}
		editor.focus();
		editor.fire('NavPanelStateChanged', {state: navPanel ? true : false});
	});

	editor.addMenuItem('navPanel', {
		text: 'Navigation pane',
		selectable: true,
		cmd: 'mceShowNavPanel',
		onPostRender: function() {
			var self = this;
			self.active(navPanel ? true : false);
			editor.on('NavPanelStateChanged', function(e) {
				self.active(e.state);
			});
		},
		context: 'view'
	});
	return {};

}, ['sidepanel']);