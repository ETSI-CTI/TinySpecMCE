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

define("tinymce/plugins/respec", [
	"tinymce/util/XHR",
	"tinymce/util/URI",
	"tinymce/util/JSON",
	"tinymce/util/Tools"
], function(XHR, URI, JSON, Tools) {

    tinymce.PluginManager.add('respec', function(editor, url) {
	var wgList = {}, wgMenu = [];
	var specTypeMenu = [
		{value:'EN', text: 'EN - ETSI European Standard (Norm)'},
		{value:'ES', text: 'ES - ETSI Standard'},
		{value:'EG', text: 'EG - ETSI Guide'},
		{value:'GS', text: 'GS - ETSI Group Specification'},
		{value:'TS', text: 'TS - ETSI Technical Specification'},
		{value:'TR', text: 'TR - ETSI Technical Report'},
		{value:'SR', text: 'SR - ETSI Special Report'}
	];

	var defaultRespecConfig = {
		wg: '',
		specStatus: 'WD',
		specType:'TS',
		specIndex:'',
		title : '',
		subtitle : '',
		specVersion : '0.0.1',
		editors: [{
			name:       "ETSI Secretariat",
			url:        "http://www.etsi.org",
			company:    "ETSI",
			companyURL: "http://www.etsi.org/"
		}]
	};

	var respecConfigRegEx = /var\s+respecConfig\s*=\s*({.*})/gm;

	function onwgMenuDone(result) {
		for (var id in result) {
			if (result.hasOwnProperty(id)) {
				var wg = result[id];
				wgMenu.push({
					text:  id + ' - ' + wg.name,
					value: id
				});
			}
		}
	}

	if (url.startsWith('file://')) {
		// TODO: to be removed later
		wgList = {
			"ITS" : {
				"name" : "Intelligent Transport System",
				"url" : "http://www.etsi.org/index.php/technologies-clusters/technologies/intelligent-transport"
			},
			"INT": {
				"name" : "Core Network and Interoperability Testing",
				"url" : "https://portal.etsi.org/tb.aspx?tbid=715&SubTB=715"
			},
			"NFV": {
				"name" : "Network Functions Virtualization",
				"url"  : "https://portal.etsi.org/tb.aspx?tbid=789&SubTB=789"
			}
		};
		onwgMenuDone(wgList);
	} else {
		// wgList must be retreaved by http request
		var errorCallback = function(message) {
			message;
		};
		XHR.send({
			url: new URI(url).toAbsolute('wg-list.json'),
			success: function(result) {
				result = JSON.parse(result);
				if (!result) {
					var message = editor.translate("Server response wasn't proper JSON.");
					errorCallback(message);
				} else if (result.error) {
					errorCallback(result.error);
				} else {
					wgList = result;
					onwgMenuDone(result);
				}
			},
			error: function() {
				var message = editor.translate("The WG List request was filed:");
				errorCallback(message);
			}
		});
	}

	function showRespecDialog() {
		if (editor.respecConfig == undefined) {
			Tools.extend(editor.respecConfig, defaultRespecConfig);
		}

		var config = editor.respecConfig;

		var win = editor.windowManager.open(
			{
				layout: "flex",
				pack: "center",
				align: "center",
				onClose: function() {
					editor.focus();
				},
				onSubmit: function() {
					function browseFields(items) {
						for (var i = 0; i < items.length; i++) {
							var n = items[i];
							if (config.hasOwnProperty(n.name())) {
								config[n.name()] = n.value();
							} else if (n.items && n.items().length) {
								browseFields(n.items());
							}
						}
					}
					browseFields(win.items());
					editor.focus();
				},
				title: "Publishing properties",
				items: {
					type: "form",
					padding: 20,
					labelGap: 30,
					spacing: 10,
					items: [
						{type: 'container', label: 'Specification ', layout: "flex", align:'center', spacing:2, items: [
							{type: 'label', text: 'ETSI '},
							{type: 'combobox', name: 'specType', size: 2, value: config.specType, menu: specTypeMenu},
							{type: 'textbox', name: 'specIndex', size: 10, placeholder:'Number', value: config.specIndex},
							{type: 'label', text: 'Version '},
							{type: 'textbox', name: 'specVersion', size: 6, value: config.specVersion}
						]},
						{type: 'textbox', name: 'title', label: 'Title', value: config.title},
						{type: 'textbox', name: 'subtitle', label: 'Subtitle', value: config.subtitle},
						{type: 'combobox', name: 'wg', label: 'Working Group', value: config.wg, menu: wgMenu}
					]
				}
			}
		);
	}

	editor.on('BeforeSetContent', function(args) {
		var b, e, data = args.content;

		var config = Object.assign({}, defaultRespecConfig);

		// remove header from args
		b = data.indexOf('<body');
		if (b > 0) {
			b = data.indexOf('>', b);
			e = data.indexOf('</body>', b);
			args.content = data.substring(b + 1, e);
		}
		b = data.indexOf('<head');
		if (b > 0) {
			e = data.indexOf('</head>', b);
			var f = editor.dom.createFragment(data.substr(b, e + 7));
			var title = '';
			h = f.querySelector('title');
			if (h) {
				title = h.textContent;
			}
			var scripts = f.querySelectorAll('script');
			for (var i = 0; i < scripts.length; i++) {
				h = scripts[i].innerHTML;
				if (h) {
					var h = respecConfigRegEx.exec(h.replace(/\s+/g, ' '));
					if (h && h[1]) {
						h = JSON.parse(h[1]);
						if (h && h.specType && h.specIndex) {
							// OK. it is a respec config;
							config = h;
							config.title = title;
						}
					}
				}
			}
		}
		editor.respecConfig = config;
	});

	editor.on('PrepareHeadHtml', function(args) {
		var respecScript = editor.settings.respecScript || "respec-etsi-debug.js";

		args.headHtml = args.headHtml +
			"<script src='" + respecScript + "' async class='remove'></script>\n" +
			"<script class='remove'>\n" +
			"  var respecConfig = " + JSON.serialize(editor.respecConfig) + ";\n" +
			"</script>\n" +
			"<title> " + editor.respecConfig.title + "</title>\n";
	});

	editor.on('SaveContent', function(args) {
		var header =
			"<!DOCTYPE html>\n" +
			"<html><head>\n" +
			"  <meta charset='utf-8'>\n";
		editor.fire('PrepareHeadHtml', {headHtml:header});
		header += "</head>\n";
		args.content = header + "<body>\n" + args.content + "\n</body>\n</html>\n";
	});

	editor.addButton('docproperties', {
		icon: 'anchor',
		tooltip: 'Publishing properties',
		onclick: showRespecDialog
	});
    });
});