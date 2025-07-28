# AI-Powered Key Insights Section for Analytics Page

## Metadata

- **ID**: 022
- **Status**: todo
- **Priority**: high
- **Category**: feature
- **Size**: XL
- **Created**: 2025-07-08
- **Updated**: 2025-07-19
- **Dependencies**: None

## Problem Statement

Add a "Key Insights" section at the top of the Analytics page that leverages AI to generate 2-3 bullet points of auto-generated insights in natural language. This will provide immediate value to users by surfacing key patterns and trends from their research data without requiring manual analysis.

## Research Notes

### Infrastructure Analysis

#### Current Analytics Infrastructure
- **Analytics Page**: `src/routes/project/Analytics.svelte` with 4 tabs (Overview, Notes Analysis, Literature Analysis, Research Designs)
- **Data Processing**: Client-side NLP using wink-nlp for text analysis of notes and literature
- **Visualization**: Chart.js integration with 15+ chart types, theme-aware styling
- **Data Sources**: Literature metadata, notes content, research designs, publication data
- **AI Services**: OpenAI and AI Query services already available in backend

#### Existing Components That Can Be Leveraged
- **Analytics Utils**: `src/routes/project/analytics/utils.ts` - comprehensive NLP and statistical analysis
- **Chart Infrastructure**: Professional charting with dynamic theming and interactivity
- **UI Components**: Established card patterns, empty states, loading states
- **Store Patterns**: ProjectStore, LiteratureStore, NotesStore for data access
- **API Client**: Centralized API communication with authentication

#### Key Data Available for Insights
- Literature: Authors, publishers, keywords, research designs, publication years, types
- Notes: Content analysis, word frequencies, semantic patterns
- Analytics: Frequency distributions, co-occurrence patterns, statistical analysis
- Research Patterns: Methodological trends, temporal distributions

### Affected Files

- `src/routes/project/Analytics.svelte` - Main analytics page component
- `src/routes/project/analytics/utils.ts` - Analytics data processing utilities
- `quester-backend/app/services/openai_service.ts` - AI insights generation
- `quester-backend/app/controllers/ai_generation_controller.ts` - API endpoint
- New files to be created for insights components and services

### Technical Context

#### AI Insight Generation Strategy
- **Data Sources**: 
  - Processed analytics data from existing utils.ts pipeline
  - Project purpose/description from project table for research context
  - Literature metadata, notes content, research designs
- **AI Processing**: Leverage existing OpenAI service with structured JSON schema responses
- **Insight Categories**:
  1. **Research Focus Patterns**: Publication years, prevalent publishers, literature types aligned with project purpose
  2. **Content Analysis**: Keyword trends, thematic patterns, methodological approaches in context of research goals
  3. **Research Gaps**: Underexplored areas, missing methodologies, opportunities to advance project purpose

#### Example Insights
- "Your research spans 2018-2023 with 65% focusing on journal articles. Psychological Science is your most cited publisher (23%), suggesting a strong cognitive psychology focus."
- "Your notes show high frequency of 'intervention' and 'cognitive bias' terms, indicating experimental research interests. Consider exploring behavioral economics literature."
- "Research designs show heavy emphasis on experimental methods (78%) but limited longitudinal studies, representing a potential research expansion opportunity."

#### Storage Strategy
- **Selected**: Create dedicated `project_insights` table for better schema design and query performance
- **Schema**: Include project_id, insight_type, content, metadata, data_version_hash, created_at, updated_at
- **Benefits**: Optimized queries, clear data separation, versioning support, easier maintenance

### Code References

#### Key Files Analyzed
- `src/routes/project/Analytics.svelte:8,519-530` - Main data loading and processing
- `src/routes/project/analytics/utils.ts:316-463` - Analytics data structure and processing
- `quester-backend/app/services/openai_service.ts:203-327` - AI analysis with structured output
- `quester-backend/app/services/ai_query_service.ts:128-726` - Advanced AI analysis capabilities

## Implementation Plan

### Phase 1: Backend Infrastructure
1. **Create InsightsService** (`app/services/insights_service.ts`)
   - Analyze processed analytics data to identify patterns
   - Generate structured insight data for AI processing
   - Implement caching and incremental updates

2. **Extend OpenAI Service** for insights generation
   - Add `generateProjectInsights()` method
   - Use structured JSON schema for consistent output
   - Process analytics data into natural language insights

3. **Create API Endpoint** (`app/controllers/insights_controller.ts`)
   - `POST /projects/:id/insights/generate` - Generate new insights
   - `GET /projects/:id/insights` - Fetch cached insights
   - Handle caching, error states, and rate limiting

4. **Create Database Model** (`database/migrations/create_project_insights_table.ts`)
   - Dedicated project_insights table with project_id, insight_type, content, metadata
   - Track generation timestamps and data versions with data_version_hash
   - Enable insight history, comparison, and efficient caching

### Phase 2: Frontend Components
1. **Create InsightCard Component** (`src/lib/components/analytics/InsightCard.svelte`)
   - Display individual insights with icons and styling
   - Support different insight types (trend, gap, recommendation)
   - Include action buttons (refresh, details)

2. **Create KeyInsights Section** (`src/lib/components/analytics/KeyInsights.svelte`)
   - Container for 2-3 key insights at top of Analytics page
   - Loading states, error handling, empty states
   - Refresh/regenerate functionality

3. **Create Insights Store** (`src/lib/stores/InsightsStore.svelte`)
   - Manage insights state and API communication
   - Handle caching and refresh logic
   - Integration with existing store patterns

### Phase 3: Integration
1. **Integrate with Analytics Page**
   - Add KeyInsights section above existing tabs
   - Connect to existing analytics data pipeline
   - Maintain consistent styling and theme support

2. **Connect Data Processing**
   - Extend analytics utils to prepare data for insights
   - Implement incremental insight generation
   - Optimize for performance with large datasets

3. **Testing and Refinement**
   - Test with various project data patterns
   - Refine AI prompts for better insight quality
   - Implement error boundaries and fallbacks

## Subtasks

### Backend Tasks
- [ ] Create InsightsService for data analysis and AI integration
- [ ] Add insights generation method to OpenAI service
- [ ] Create insights API controller and endpoints  
- [ ] Create project_insights database table and model
- [ ] Add insights validation schemas

### Frontend Tasks
- [ ] Create InsightCard component for displaying individual insights
- [ ] Create KeyInsights section component for Analytics page
- [ ] Create InsightsStore for state management
- [ ] Integrate insights section into Analytics page
- [ ] Add insights data processing to analytics utils

### Integration Tasks
- [ ] Connect insights service with existing analytics data
- [ ] Implement caching mechanism for insights
- [ ] Add refresh/regenerate insights functionality
- [ ] Add loading states and error handling
- [ ] Test with various data patterns and edge cases

## Acceptance Criteria

- [ ] Key Insights section appears at top of Analytics page
- [ ] Displays 2-3 AI-generated insights in natural language
- [ ] Insights are generated from actual project data (literature, notes, analytics)
- [ ] Insights refresh when project data changes significantly
- [ ] Loading states, error handling, and empty states work correctly
- [ ] UI is consistent with existing Analytics page design
- [ ] Performance is acceptable for projects with large datasets
- [ ] Insights provide genuine value and actionable information

## Related Tasks

- Task 021 (Global Control Bar)
