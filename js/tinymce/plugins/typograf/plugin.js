/**
 * plugin.js
 *
 * Released under LGPL License.
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

/*global tinymce:true */

tinymce.PluginManager.add('typograf', function (editor, url) {
    'use strict';

    var scriptLoader = new tinymce.dom.ScriptLoader(),
        tp,
        typo = function () {
            if (tp) {
                editor.setContent(tp.execute(editor.getContent()));
                editor.undoManager.add();
            }
        };

    scriptLoader.add(url + '/typograf.min.js');

    scriptLoader.loadQueue(function () {
        tp = new Typograf({
            lang: 'en',
            mode: 'name'
        });
    });

    editor.addButton('typograf', {
        text: 'Apply Rules',
        icon: 'blockquote',
        onclick: typo
    });

    editor.addMenuItem('typograf', {
        context: 'format',
        text: 'Apply Rules',
        icon: 'blockquote',
        onclick: typo
    });
});
