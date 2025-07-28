# Model Function Improvements

## Metadata

- **ID**: 008
- **Status**: todo
- **Priority**: high
- **Category**: feature
- **Size**: XL
- **Created**: 2025-01-07
- **Updated**: 2025-01-07
- **Dependencies**: None

## Problem Statement

Multiple improvements needed for Model functionality: adjustable box order (move to back/front), ellipses instead of circles, Ctrl-Z should work for shape positions, and investigation of 401 errors.

## Research Notes

### Architecture Analysis

**Current XYFlow Integration:**

- Uses XYFlow/Svelte v6 for flow diagrams (`src/lib/components/model/Model.svelte:1-25`)
- Two node types: `ResizableNode` (rectangles) and `CircleNode` (circles)
- Auto-save functionality with 1-second debounce
- Real-time collaborative editing support

**Existing Shape System:**

- `ResizableNode.svelte`: Rectangles with square/rounded corner options
- `CircleNode.svelte`: Perfect circles with aspect ratio locking
- Both support extensive customization (colors, borders, text, effects)
- No ellipse shape currently available

**Current Limitations:**

- No z-index/layering controls for node ordering
- No undo/redo for node position changes (only in rich text editor)
- No keyboard shortcuts for model operations
- Basic error handling without specific 401 error recovery

### Affected Files

- Model component: `src/lib/components/model/Model.svelte`
- Model view: `src/routes/project/ModelView.svelte`
- Model store: `src/lib/stores/ModelStore.svelte`
- Node components: `src/lib/components/model/ResizableNode.svelte`, `CircleNode.svelte`
- Toolbar: `src/lib/components/model/FlowToolbar.svelte`

### Technical Context

- XYFlow for model visualization
- Shape manipulation and layering
- Undo/redo functionality
- Authentication and session management

### Investigation Findings

1. **Z-Index/Layering**: No current implementation for moving nodes to front/back
2. **Ellipse Shape**: Missing from current node types
3. **Undo/Redo**: Only exists in TipTap editor, not for model operations
4. **401 Errors**: Generic error handling exists but no specific 401 recovery patterns

## Implementation Plan

### Phase 1: Z-Index/Layering Controls (HIGH PRIORITY)

**Files to modify:**

- `src/lib/components/model/ResizableNode.svelte` (add layer controls to NodeToolbar)
- `src/lib/components/model/CircleNode.svelte` (add layer controls to NodeToolbar)
- `src/lib/components/model/Model.svelte` (implement z-index logic)

**Technical approach:**

1. Add z-index data property to node data structure
2. Implement "Bring to Front" and "Send to Back" in NodeToolbar
3. Add z-index CSS styling to node containers
4. Update node saving/loading to preserve z-index values

### Phase 2: Ellipse Node Type (MEDIUM PRIORITY)

**Files to create/modify:**

- Create `src/lib/components/model/EllipseNode.svelte` (new component)
- Update `src/lib/components/model/Model.svelte` (register new node type)
- Update `src/lib/components/model/FlowToolbar.svelte` (add ellipse button)

**Technical approach:**

1. Create EllipseNode component based on CircleNode structure
2. Use CSS `border-radius: 50%` with different width/height ratios
3. Add ellipse-specific resize handles and constraints
4. Maintain consistent styling options with other nodes

### Phase 3: Undo/Redo System (MEDIUM PRIORITY)

**Files to create/modify:**

- Create `src/lib/stores/UndoRedoStore.svelte` (new state management)
- Update `src/lib/components/model/Model.svelte` (integrate undo/redo)
- Update `src/routes/project/ModelView.svelte` (keyboard shortcuts)

**Technical approach:**

1. Implement history stack for node positions and properties
2. Add Ctrl+Z and Ctrl+Y keyboard event listeners
3. Snapshot state before any node modification
4. Provide undo/redo for position, resize, and property changes

## Subtasks

- [x] Implement z-index controls for nodes (send to back/bring to front)
- [x] Create EllipseNode component with proper aspect ratio handling
- [x] Build undo/redo system for model operations
- [x] Add Ctrl+Z/Ctrl+Y keyboard shortcuts
- [x] Test all functionality with existing models

## Implementation Notes

### Phase 1: Z-Index Controls ✅ COMPLETED
**Files modified:**
- `src/lib/components/model/ResizableNode.svelte` - Added z-index state and layer control buttons
- `src/lib/components/model/CircleNode.svelte` - Added z-index state and layer control buttons  
- `src/lib/components/model/Model.svelte` - Implemented z-index event handlers and CSS styling

**Features implemented:**
- "Bring to Front" and "Send to Back" buttons in NodeToolbar
- Z-index data property persistence in node data structure
- CSS z-index styling with relative positioning
- Event-driven architecture for layer management

### Phase 2: EllipseNode Component ✅ COMPLETED
**Files created/modified:**
- `src/lib/components/model/EllipseNode.svelte` - New ellipse node component
- `src/lib/components/model/Model.svelte` - Registered EllipseNode type
- `src/lib/components/model/FlowToolbar.svelte` - Added ellipse button with flex-wrap layout

**Features implemented:**
- Ellipse shape using CSS border-radius: 50% with custom width/height ratios
- All styling options consistent with existing nodes (colors, borders, text, effects)
- Proper resizing constraints (minWidth: 40, minHeight: 30)
- Z-index support included from the start

### Phase 3: Undo/Redo System ✅ COMPLETED
**Files created/modified:**
- `src/lib/stores/UndoRedoStore.svelte` - New undo/redo state management store
- `src/lib/components/model/Model.svelte` - Integrated undo/redo with debounced state saving
- `src/routes/project/ModelView.svelte` - Added keyboard shortcuts (Ctrl+Z/Ctrl+Y)

**Features implemented:**
- History stack with 50-state limit and deep cloning
- Debounced state saving (500ms) to avoid excessive history entries
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y/Ctrl+Shift+Z (redo)
- Prevention of circular updates during history application
- Cross-platform support (Ctrl on Windows/Linux, Cmd on Mac)

### Technical Decisions and Trade-offs

1. **Event-driven Architecture**: Used custom events for z-index controls to maintain loose coupling between components
2. **Debounced State Saving**: Implemented 500ms debounce for undo/redo to balance responsiveness with memory usage
3. **Deep Cloning**: Used JSON.parse/stringify for history states to ensure complete isolation
4. **Keyboard Shortcuts**: Added global window listener in ModelView for consistent shortcut behavior
5. **Backward Compatibility**: All new features gracefully handle existing models without z-index or missing data

## Technical Considerations

1. **Backward Compatibility**: Ensure existing models load correctly with new features
2. **Performance**: Z-index changes and undo/redo should not impact rendering performance
3. **State Persistence**: All new properties must be properly saved to backend
4. **User Experience**: Features should feel intuitive and follow design system patterns

## Related Tasks

Task 009 (Model export issues)
