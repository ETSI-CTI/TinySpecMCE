# Inline processing plugin
## provides an API for on-typing text processing

Subordinate plugins van register itself using the `mceInlineRegister` event, providing registering options (see code)

Subordinate plugins can handle the `mceInlineSetContent` event to modify the new content of the file.

On typing the `processTextNode` hook will be called with current text node.

