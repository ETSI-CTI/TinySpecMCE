
define("tinymce/ui/SidePanelHeader", [
	"tinymce/ui/TabPanel",
	"tinymce/dom/DomQuery"
], function(TabPanel, $) {
	return TabPanel.extend({
		recalc: function(){},
		render: function(){
			var self = this;
			var containerElm = self.getEl('body');
			var tabsElm = self.getEl('head');
			var prefix = self.classPrefix;
		        
			// Render any new items
			self.items().each(function(ctrl, index) {
		        
				ctrl.parent(self);
				
				if (!ctrl.state.get('rendered')) {
					// prepare button
					var btnId = self._id + '-t' + index;
					var btnHtm =	'<div id="' + btnId + '" class="' + prefix + 'tab" ' +
							'unselectable="on" role="tab" aria-controls="' + ctrl._id + '" aria-selected="false" tabIndex="-1">' +
								self.encode(ctrl.settings.title) +
							'</div>'
		        
					ctrl.aria('role', 'tabpanel');
					ctrl.aria('labelledby', btnId);
					// Insert or append the item
					if (containerElm.hasChildNodes() && index <= containerElm.childNodes.length - 1) {
						$(containerElm.childNodes[index]).before(ctrl.renderHtml());
						$(tabsElm.childNodes[index]).before(btnHtm);
					} else {
						$(containerElm).append(ctrl.renderHtml());
						$(tabsElm).append(btnHtm);
					}
					ctrl.on("remove", function(){
						self._elmCache[btnId] = null;
						$('#'+btnId).remove();
					});
		        
					ctrl.postRender();
				}
			});
		}
	});
});
