# Add Announcement System

## Metadata
- **ID**: 026
- **Status**: todo
- **Priority**: medium
- **Category**: feature
- **Size**: L
- **Created**: 2025-07-20
- **Updated**: 2025-07-20
- **Dependencies**: None

## Problem Statement
The application needs a comprehensive announcement system to surface targeted announcements to users. The system must track user interactions (view, dismiss) and support multiple custom announcement components within a reusable modal interface. This will enable administrators to communicate important updates, feature announcements, and system notifications to users based on their organizational context and permissions.

## Research Notes

### Affected Files

**Frontend Files:**
- `src/lib/components/ui/dialog/` - Base modal system (foundation)
- `src/lib/stores/` - State management location for AnnouncementStore
- `src/lib/services/api-client.ts` - API integration patterns
- `src/App.svelte` - Global component integration point
- `src/lib/components/ui/sonner/` - Toast notification system for fallback
- `src/lib/components/global-search/GlobalSearchDialog.svelte` - Reference for complex modal implementation

**Backend Files:**
- `app/models/` - Location for Announcement and UserAnnouncementInteraction models
- `app/controllers/` - Location for AnnouncementsController
- `app/services/` - Location for AnnouncementService
- `database/migrations/` - Database schema for announcement tables
- `app/services/permission_service.ts` - Permission integration for targeting
- `start/routes.ts` - API route definitions

### Technical Context

**Frontend Architecture:**
- Svelte 5 with runes API (`$state`, `$derived`, `$effect`)
- Modal system built on bits-ui with custom components
- Sophisticated animation and positioning system
- Global state management with dedicated stores
- Event-driven communication patterns
- Toast notifications with sonner for supplementary messaging

**Backend Architecture:**
- AdonisJS with PostgreSQL database
- UUID-based models with soft deletes and versioning
- Hierarchical permission system (organization → department → project)
- Service layer separation with dependency injection
- Event tracking system for user interactions
- Polymorphic settings system for entity-specific configuration

**Announcement Scope:**
- Global announcements visible to all authenticated users
- Simple user-based interaction tracking without complex targeting
- Future extensibility for permission-based targeting if needed

### Code References

**Modal Implementation Patterns:**
- `src/lib/components/ui/dialog/dialog-content.svelte:1-50` - Base modal structure
- `src/lib/components/global-search/GlobalSearchDialog.svelte:1-200` - Complex modal with state management
- `src/lib/components/analytics/InsightsHistoryModal.svelte:1-150` - Modal with reactive data loading

**State Management Patterns:**
- `src/lib/stores/GlobalSearchStore.svelte.ts:1-100` - Global store with reactive state
- `src/lib/stores/AuthStore.svelte:1-50` - User state management patterns
- `src/lib/services/api-client.ts:1-50` - API integration patterns

**Backend Model Patterns:**
- `app/models/user.ts:1-100` - User model structure and relationships
- `app/models/setting.ts:1-80` - Polymorphic entity association patterns
- `app/controllers/settings_controller.ts:1-200` - Controller patterns with validation

## Subtasks

### Backend Implementation
1. **Create Database Models**
   - Create Announcement model (simplified for global announcements)
   - Create UserAnnouncementInteraction model for tracking
   - Add database migrations with proper indexing
   - Add model relationships and validations

2. **Implement API Layer**
   - Create AnnouncementsController with CRUD operations
   - Implement AnnouncementService with business logic
   - Add VineJS validators for input validation
   - Create API routes with permission middleware

3. **Add Basic Access Control**
   - Implement simple authenticated user access
   - Add admin-only management operations
   - Future-proof for permission-based targeting

4. **Implement Tracking System**
   - Add user interaction tracking endpoints
   - Integrate with existing event system
   - Implement view/dismiss state management
   - Add analytics integration for announcement metrics

### Frontend Implementation
5. **Create Store and Services**
   - Implement AnnouncementStore with Svelte 5 runes
   - Add API service methods for announcements
   - Implement local state persistence
   - Add reactive state for modal visibility

6. **Build Modal Components**
   - Create AnnouncementModal base component
   - Implement reusable announcement container
   - Add animation and positioning logic
   - Support multiple announcement types in single modal

7. **Create Custom Announcement Components**
   - Build AnnouncementOne custom component
   - Build AnnouncementTwo custom component
   - Implement configurable announcement system
   - Add support for custom styling and content

8. **Add Global Integration**
   - Integrate announcement modal in App.svelte
   - Add keyboard shortcuts and accessibility
   - Implement auto-show logic on app load
   - Add preference management for announcement frequency

### Configuration and Testing
9. **Add Configuration System**
   - Create announcement type definitions
   - Add priority and targeting configuration
   - Implement announcement scheduling system
   - Add admin interface for announcement management

10. **Testing and Polish**
    - Add interaction tracking validation
    - Test permission-based visibility
    - Validate responsive design across devices
    - Add error handling and fallback states

## Related Tasks
- Consider creating a follow-up task for admin announcement management interface
- Potential integration with existing notification preferences system
- Future enhancement: Rich media support in announcements
- Analytics dashboard for announcement engagement metrics

## Implementation Architecture

### System Overview
The announcement system will provide a global notification platform with:
- **Global Delivery**: Announcements visible to all authenticated users
- **Custom Components**: Flexible announcement content with reusable components  
- **Interaction Tracking**: Full visibility into user engagement (view, dismiss, click)
- **Simple Access Control**: Admin management with user interaction tracking
- **Modal Interface**: Sophisticated modal system supporting multiple announcements

### Data Flow
1. **Creation**: Admins create global announcements through API
2. **Delivery**: Frontend fetches all active announcements for authenticated users
3. **Display**: Modal system presents announcements with custom components
4. **Interaction**: User actions tracked and persisted to backend
5. **Management**: System respects user dismissal state and preferences

### Technology Integration
- **Frontend**: Svelte 5 + bits-ui modal system + reactive stores
- **Backend**: AdonisJS + PostgreSQL + simple authentication
- **API**: RESTful endpoints with validation and error handling
- **State**: Local storage + backend persistence for user preferences

This implementation provides a scalable, maintainable announcement system that integrates seamlessly with the existing application architecture while delivering the flexibility needed for custom announcement content. The system is designed for future extensibility to support targeted announcements when needed.
