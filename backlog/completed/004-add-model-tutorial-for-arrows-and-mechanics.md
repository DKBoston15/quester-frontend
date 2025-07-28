# Add Model Tutorial for Arrows and Mechanics

## Metadata
- **ID**: 004
- **Status**: todo
- **Priority**: medium
- **Category**: feature
- **Size**: L
- **Created**: 2025-01-07
- **Updated**: 2025-01-07
- **Dependencies**: None

## Problem Statement
Users need guidance on how to use arrows and other mechanics in the Model feature to create effective research models.

## Research Notes
### Affected Files
- Model component: `src/lib/components/model/Model.svelte`
- Model route: `src/routes/project/Models.svelte`
- Model view: `src/routes/project/ModelView.svelte`

### Technical Context
- Uses XYFlow for model visualization
- Interactive model building interface
- Arrow connections and node relationships

### Code References
- Model component: `src/lib/components/model/Model.svelte`
- Model routes: `src/routes/project/Models.svelte`, `src/routes/project/ModelView.svelte`

## Subtasks
- [ ] Analyze current Model interface capabilities
- [ ] Design tutorial flow for arrows and connections
- [ ] Create tutorial content and examples
- [ ] Implement interactive tutorial overlay
- [ ] Add tutorial trigger in Model interface
- [ ] Test tutorial with new users

## Implementation Plan

### Current State Analysis
- Tutorial is implemented using driver.js in ModelView.svelte
- Node creation is handled by FlowToolbar.svelte's `addNode` function
- Nodes show a NodeToolbar when selected (ResizableNode.svelte:96)
- Tutorial already has automated actions:
  - Auto-clicking node buttons (lines 113-124, 138-149)
  - Auto-connecting nodes via custom event (lines 164-169)
  - Auto-selecting edges (lines 183-199)

### Required Enhancements

1. **Automatic Node Creation on Tutorial Step**
   - When user advances to the node creation step in the tutorial
   - Create a node programmatically in the center of canvas
   - Position the tutorial tooltip over the newly created node
   - Remove the current button-clicking automation

2. **Automatic Node Menu Display**
   - When reaching the node editing step in tutorial
   - Programmatically select the node (set selected=true)
   - This will automatically show the NodeToolbar
   - Position tutorial tooltip to explain the node editing options

### Implementation Steps

1. **Modify ModelView.svelte Tutorial**
   - Update the node creation step to use `onHighlightStarted` callback
   - Instead of clicking button, dispatch a custom event to create node directly
   - Update the element selector to target the newly created node

2. **Add Event Handler in Model.svelte**
   - Create `handleTutorialAddNode` event listener
   - Use `addNode` function from FlowToolbar (expose it via props/events)
   - Ensure node is created at canvas center
   - Return node ID for tutorial to target

3. **Update Node Selection Step**
   - Add tutorial step that programmatically selects the node
   - Use XYFlow's node selection API
   - NodeToolbar will appear automatically when node.selected = true
   - Position tooltip to explain the toolbar options

### Technical Details
- Use existing `addNode` function but call it programmatically
- Leverage XYFlow's built-in selection mechanism
- No need for custom menus - use existing NodeToolbar
- Maintain smooth tutorial flow with proper timing

## Implementation Notes

### Completed Implementation

1. **Added Event Handlers in Model.svelte**
   - Created `handleTutorialAddNode` event listener that programmatically creates nodes
   - Created `handleTutorialSelectNode` event listener that selects nodes to show the NodeToolbar
   - Nodes are positioned at viewport center for visibility
   - Events dispatch responses with node IDs for tutorial targeting

2. **Updated Tutorial Steps in ModelView.svelte**
   - Modified node creation step to use programmatic creation instead of button clicks
   - Added dynamic element selector using node ID from previous step
   - Added node selection step that automatically shows the NodeToolbar
   - Added new tutorial step for the NodeToolbar explanation
   - Added cleanup to clear selection when appropriate

3. **Enhanced Node Components**
   - Added `data-node-toolbar` attribute to ResizableNode.svelte NodeToolbar
   - Added `data-node-toolbar` attribute to CircleNode.svelte NodeToolbar
   - This allows the tutorial to target the toolbar when it appears

### How It Works

1. When user advances to the node creation step, the tutorial:
   - Dispatches `tutorialAddNode` event
   - Model.svelte creates a node at viewport center
   - Returns node ID via `tutorialNodeCreated` event
   - Tutorial uses this ID to target the specific node

2. When highlighting the node, the tutorial:
   - Dispatches `tutorialSelectNode` event with the node ID
   - Model.svelte updates node selection state
   - NodeToolbar automatically appears (built-in XYFlow behavior)
   - Tutorial can then target the toolbar with `[data-node-toolbar]` selector

### Benefits
- Smoother user experience without button click animations
- Node appears directly in view
- Automatic menu display demonstrates the UI naturally
- Tutorial flow is more intuitive

## Related Tasks
None currently