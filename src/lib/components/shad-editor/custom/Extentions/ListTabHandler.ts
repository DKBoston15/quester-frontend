import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// Custom extension to handle Tab behavior in lists
export const ListTabHandler = Extension.create({
  name: 'listTabHandler',
  
  // Set high priority to ensure this extension's shortcuts are processed first
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      // Handle Tab key for indenting list items
      Tab: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // Check if we're in a list item (ordered or bullet list)
        let depth = $from.depth;
        let listItem = null;
        let parentList = null;
        
        // Walk up the document tree to find list context
        for (let i = depth; i > 0; i--) {
          const node = $from.node(i);
          if (node.type.name === 'listItem' && !listItem) {
            listItem = node;
          }
          if ((node.type.name === 'orderedList' || node.type.name === 'bulletList') && !parentList) {
            parentList = node;
            break;
          }
        }
        
        if (listItem && parentList) {
          // We're in a list, try to indent
          return editor.commands.sinkListItem('listItem');
        }

        // Not in a list, but still prevent browser tab navigation
        return true;
      },

      // Handle Shift+Tab for outdenting list items
      'Shift-Tab': ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // Check if we're in a list item (ordered or bullet list)
        let depth = $from.depth;
        let listItem = null;
        let parentList = null;
        
        // Walk up the document tree to find list context
        for (let i = depth; i > 0; i--) {
          const node = $from.node(i);
          if (node.type.name === 'listItem' && !listItem) {
            listItem = node;
          }
          if ((node.type.name === 'orderedList' || node.type.name === 'bulletList') && !parentList) {
            parentList = node;
            break;
          }
        }
        
        if (listItem && parentList) {
          // We're in a list, try to outdent
          return editor.commands.liftListItem('listItem');
        }

        // Not in a list, but still prevent browser behavior
        return true;
      },
    };
  },

  // Add DOM event handling as backup
  addProseMirrorPlugins() {
    const extension = this;
    
    return [
      new Plugin({
        key: new PluginKey('listTabHandler'),
        props: {
          handleDOMEvents: {
            keydown: (view, event) => {
              // Handle Tab key
              if (event.key === 'Tab') {
                const { state } = view;
                const { selection } = state;
                const { $from } = selection;

                // Check if we're in a list item
                let depth = $from.depth;
                let listItem = null;
                let parentList = null;
                
                for (let i = depth; i > 0; i--) {
                  const node = $from.node(i);
                  if (node.type.name === 'listItem' && !listItem) {
                    listItem = node;
                  }
                  if ((node.type.name === 'orderedList' || node.type.name === 'bulletList') && !parentList) {
                    parentList = node;
                    break;
                  }
                }
                
                if (listItem && parentList) {
                  event.preventDefault();
                  
                  if (event.shiftKey) {
                    // Shift+Tab: outdent
                    extension.editor.commands.liftListItem('listItem');
                  } else {
                    // Tab: indent
                    extension.editor.commands.sinkListItem('listItem');
                  }
                  return true;
                }
                
                // Always prevent default tab behavior in editor
                event.preventDefault();
                return true;
              }
              
              return false;
            }
          }
        }
      })
    ];
  },
});