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

tinymce.PluginManager.add('inlines', function(editor, url) {

	var submodules = [];

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

	editor.on('mceInlineRegister', function(options){
		submodules.push(options);
	});

	editor.on('SetContent', function() {
		var list, dom = editor.dom, doc = editor.dom.doc;

		editor.fire('mceInlineSetContent', editor);

		var txts = allTextNodes(dom.select('body')[0], ["pre"]);
		for (var m = 0; m < submodules.length; m++) {
			var subm = submodules[m];
			if(subm.processTextNode){
				for (var i = 0; i < txts.length; i++) {
					var txt = txts[i];
					var df = subm.processTextNode(editor, txt);
					if(df){
						var newtxt = allTextNodes(df, ["pre"]);
						// insert this text nodes in place of old ones
						txts.splice.apply(txts, [i, 1].concat(newtxt));
						i += newtxt.length - 1;
						txt.parentNode.replaceChild(df, txt);
					}
				}
			}
		}
	});

	editor.on('keyup', function(e) {
		var keyCode = e.keyCode;
		var modKey = (e.ctrlKey && !e.altKey) || e.metaKey;
		if(!modKey && (keyCode < 16 || keyCode == 32 || (keyCode > 40 && keyCode < 91) || keyCode > 93)){
			console.log(e);
			var txt = editor.selection.getRng().startContainer;
			for (var m = 0; m < submodules.length; m++) {
				var subm = submodules[m];
				if(subm.processTextNode) {
					var df = subm.processTextNode(editor, txt);
					if(df){
						txt.parentNode.replaceChild(df, txt);
					}
				}
			}
		}

	});
});
