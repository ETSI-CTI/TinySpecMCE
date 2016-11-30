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

tinymce.PluginManager.add('tabulator', function(editor) {
	editor.on('keydown', function(ev){
		if (ev.keyCode == 9) { // tab pressed
			editor.execCommand('mceInsertContent', false, '&emsp;&emsp;');
			ev.preventDefault();
			return false;
		}
	});
});
