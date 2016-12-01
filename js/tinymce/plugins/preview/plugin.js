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

tinymce.PluginManager.add('preview', function(editor) {
	var settings = editor.settings, sandbox = !tinymce.Env.ie;

	function getWindowSize() {
		var w, h, win = window, doc = document;
		var body = doc.body;

		// Old IE
		if (body.offsetWidth) {
			w = body.offsetWidth;
			h = body.offsetHeight;
		}

		// Modern browsers
		if (win.innerWidth && win.innerHeight) {
			w = win.innerWidth;
			h = win.innerHeight;
		}

		return {w: w, h: h};
	}

	editor.addCommand('mcePreview', function() {

		var winSize = getWindowSize();
		winSize.w = winSize.w * 4 / 5;
		winSize.h = winSize.h * 4 / 5;
		
		editor.windowManager.open({
			title: 'Preview',
			width: parseInt(editor.getParam("plugin_preview_width", winSize.w), 10),
			height: parseInt(editor.getParam("plugin_preview_height", winSize.h), 10),
			html: '<iframe src="javascript:\'\'" frameborder="0"' + (sandbox ? ' sandbox="allow-scripts"' : '') + '></iframe>',
			buttons: {
				text: 'Close',
				onclick: function() {
					this.parent().parent().close();
				}
			},
			onPostRender: function() {
				var previewHtml, headHtml = '';

				headHtml += '<base href="' + editor.documentBaseURI.getURI() + '">';

				var args = {
					headHtml: headHtml
				};
				editor.fire('PrepareHeadHtml', args);
				headHtml = args.headHtml;

				tinymce.each(editor.contentCSS, function(url) {
					headHtml += '<link type="text/css" rel="stylesheet" href="' + editor.documentBaseURI.toAbsolute(url) + '">';
				});

				var bodyId = settings.body_id || 'tinymce';
				if (bodyId.indexOf('=') != -1) {
					bodyId = editor.getParam('body_id', '', 'hash');
					bodyId = bodyId[editor.id] || bodyId;
				}

				var bodyClass = settings.body_class || '';
				if (bodyClass.indexOf('=') != -1) {
					bodyClass = editor.getParam('body_class', '', 'hash');
					bodyClass = bodyClass[editor.id] || '';
				}

				var preventClicksOnLinksScript = (
					'<script>' +
						'document.addEventListener && document.addEventListener("click", function(e) {' +
							'for (var elm = e.target; elm; elm = elm.parentNode) {' +
								'if (elm.nodeName === "A") {' +
									'e.preventDefault();' +
								'}' +
							'}' +
						'}, false);' +
					'</script> '
				);

				var dirAttr = editor.settings.directionality ? ' dir="' + editor.settings.directionality + '"' : '';

				previewHtml = (
					'<!DOCTYPE html>' +
					'<html>' +
					'<head>' +
						headHtml +
					'</head>' +
					'<body id="' + bodyId + '" class="mce-content-body ' + bodyClass + '"' + dirAttr + '>' +
						editor.getContent() +
						preventClicksOnLinksScript +
					'</body>' +
					'</html>'
				);

				if (!sandbox) {
					// IE 6-11 doesn't support data uris on iframes
					// so I guess they will have to be less secure since we can't sandbox on those
					// TODO: Use sandbox if future versions of IE supports iframes with data: uris.
					var doc = this.getEl('body').firstChild.contentWindow.document;
					doc.open();
					doc.write(previewHtml);
					doc.close();
				} else {
					this.getEl('body').firstChild.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(previewHtml);
				}
			}
		});
	});

	editor.addButton('preview', {
		title: 'Preview',
		cmd: 'mcePreview'
	});

	editor.addMenuItem('preview', {
		text: 'Preview',
		cmd: 'mcePreview',
		context: 'view'
	});
});
