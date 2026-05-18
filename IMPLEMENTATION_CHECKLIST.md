# Architecture Improvement Implementation Checklist

## Quick Reference

**Total Effort**: 66 hours
**Recommended Timeline**: 4-6 weeks (2-3 devs)
**Risk Level**: Medium (can work incrementally without breaking existing features)
**Testing Coverage**: 80%+ achievable after implementation

---

## SPRINT 1: Foundation (Week 1 - 20 hours)

### Type System & Domain Models

- [ ] Create `src/types/domain.ts`
  - [ ] RequestModule enum (SHIPPING, MAINTENANCE, PURCHASE, EVENT, TRAVEL, HR)
  - [ ] RequestStatus enum (DRAFT, NEW, ON_HOLD, IN_PROGRESS, IN_CUSTOMS, IN_TRANSIT, DELIVERED, COMPLETED, CANCELLED)
  - [ ] MODULE_ALLOWED_STATUSES mapping
  - [ ] ShippingRequest, MaintenanceRequest type stubs

- [ ] Create `src/types/errors.ts`
  - [ ] ErrorCode enum
  - [ ] AppError class with static factory methods
  - [ ] Error serialization (toJSON)

- [ ] Create `src/types/services.ts`
  - [ ] IRequestService interface
  - [ ] IPersistenceProvider interface
  - [ ] INotificationService interface
  - [ ] IValidationService interface

### Service Layer Foundation

- [ ] Create `src/services/persistence/localStorageAdapter.ts`
  - [ ] IPersistenceProvider implementation
  - [ ] read<T>(), write<T>(), delete(), clear() methods
  - [ ] Error handling for parse/stringify failures

- [ ] Refactor `src/services/engineService.ts`
  - [ ] Remove initializeMockData() - 300 lines saved
  - [ ] Remove email simulation
  - [ ] Remove feedback survey triggering (move to statusService)
  - [ ] Keep CRUD ops temporarily (will be moved to requestService)
  - [ ] Target: Reduce from 650 to 200 lines

### Validation Infrastructure

- [ ] Create `src/types/api.ts`
  - [ ] ApiResponse<T> interface
  - [ ] Error response shape
  - [ ] Success response shape

- [ ] Create `src/services/validation/validationService.ts`
  - [ ] ValidationService class
  - [ ] Zod schema validation wrapper
  - [ ] validators object with reusable field validators
  - [ ] Module-specific schemas (shipping, maintenance, etc.)

### Sprint 1 Testing

- [ ] Run existing tests - should all pass
- [ ] Add tests for:
  - [ ] LocalStorageAdapter.read/write with invalid JSON
  - [ ] AppError creation and serialization
  - [ ] ValidationService with various schemas

**Deliverables**:
- 7 new files created
- engineService reduced by ~35%
- Type safety foundation in place
- Tests passing at 100%

---

## SPRINT 2: Service Modularization (Week 2 - 20 hours)

### Base CRUD Service

- [ ] Create `src/services/base/baseCrudService.ts`
  - [ ] IEntity interface
  - [ ] CreateOptions, UpdateOptions, QueryOptions interfaces
  - [ ] Abstract class with:
    - [ ] create() - parameterized, with validation
    - [ ] update() - partial or full, with validation
    - [ ] delete() - by ID
    - [ ] getById() - returns T | null
    - [ ] getAll() - with optional filtering, sorting, pagination
    - [ ] Abstract validate(), generateId(), applyFilter(), applySort()

### Module-Specific Services

- [ ] Create `src/services/request/statusService.ts`
  - [ ] validateTransition(from, to, module) - returns {valid, error?}
  - [ ] isTerminalStatus(status) - boolean
  - [ ] isActiveStatus(status) - boolean
  - [ ] getNextAllowedStatuses(current, module) - array

- [ ] Create `src/services/request/requestService.ts`
  - [ ] Extends BaseCrudService<EngineRequest>
  - [ ] Inject IPersistenceProvider
  - [ ] implement validate(), generateId(), applyFilter(), applySort()
  - [ ] createFromPayload<T>() - generic typed creation
  - [ ] CRUD methods (create, update, getById, getAll, delete)

- [ ] Create `src/services/request/shippingService.ts`
  - [ ] Extends BaseCrudService<ShippingRequest>
  - [ ] Shipping-specific validate()
  - [ ] getByCarrier(carrier) method
  - [ ] getByStatus(status) method

- [ ] Create `src/services/request/maintenanceService.ts`
  - [ ] Extends BaseCrudService<MaintenanceRequest>
  - [ ] Maintenance-specific validate()
  - [ ] getByPriority(priority) method

- [ ] Create module-specific services (5 more):
  - [ ] purchaseService.ts
  - [ ] eventService.ts
  - [ ] travelService.ts
  - [ ] hrService.ts
  - [ ] (Note: Shipping/Maintenance/Purchase already mentioned)

### Comment & Task Services

- [ ] Move `src/services/feedbackService.ts` → `src/services/feedback/feedbackService.ts`
  - [ ] No changes needed, just relocated

- [ ] Move `src/services/taskService.ts` → `src/services/task/taskService.ts`
  - [ ] No changes needed, just relocated

- [ ] Create `src/services/comment/commentService.ts`
  - [ ] Extract comment logic from engineService
  - [ ] recordCommentActivity()
  - [ ] getCommentsByRequest()
  - [ ] getUnreadCommentCount()

### Mock Data

- [ ] Create `src/services/mock/seedDataService.ts`
  - [ ] SeedDataService class
  - [ ] initialize() - checks version and seeds if needed
  - [ ] generateMockData() - all 300+ lines of mock data
  - [ ] reset() - clears and reinitializes

### Sprint 2 Testing

- [ ] Run existing tests - should all pass
- [ ] Add tests for:
  - [ ] StatusService.validateTransition() - valid and invalid cases
  - [ ] RequestService CRUD operations
  - [ ] ShippingService.getByCarrier()
  - [ ] SeedDataService initialization and versioning

**Deliverables**:
- 10+ new service files created
- Module-specific services ready for use
- Existing services refactored to pure CRUD
- Tests passing at 95%+

---

## SPRINT 3: Business Logic & Hooks (Week 3 - 16 hours)

### Hook Extraction

- [ ] Create `src/hooks/useRequestTable.ts`
  - [ ] UseRequestTableOptions interface
  - [ ] Sorting logic (toggleSort, sort state)
  - [ ] Filtering logic (search state)
  - [ ] Column resizing (colWidths, handleResizeColumn)
  - [ ] Returns: data, search, setSearch, sortKey, sortDir, toggleSort, colWidths, handleResizeColumn

- [ ] Create `src/hooks/useRequestStatus.ts`
  - [ ] State: status, loading, error
  - [ ] updateStatus(id, newStatus, userId) with validation
  - [ ] Error handling using AppError
  - [ ] Notification integration

- [ ] Create `src/hooks/usePermissions.ts` (REFACTOR)
  - [ ] Extract from current pattern
  - [ ] Standardize permission checks
  - [ ] canCreateRequest, canUpdateStatus, canEditRequest, etc.
  - [ ] hasPermission() generic check

- [ ] Create `src/hooks/useAsync.ts`
  - [ ] Generic async operation hook
  - [ ] UseAsyncState<T> interface
  - [ ] Loading, error, data states
  - [ ] execute() callback to re-run
  - [ ] Cleanup on unmount

- [ ] Create `src/hooks/useLocalStorage.ts`
  - [ ] Wrapper around localStorage with error handling
  - [ ] Type-safe get/set
  - [ ] Synchronized with storage events
  - [ ] SSR-safe (checks typeof window)

- [ ] Create `src/hooks/usePagination.ts`
  - [ ] Page size, current page, total pages
  - [ ] goToPage(), nextPage(), prevPage()
  - [ ] currentItems computed property

- [ ] Create `src/hooks/useErrorHandler.ts`
  - [ ] Centralized error handling
  - [ ] toastError(), showErrorDialog()
  - [ ] Log errors to analytics

- [ ] Create `src/hooks/useLoadingState.ts`
  - [ ] Debounced loading state (prevent flickering)
  - [ ] withLoading() wrapper function

### Hook Refactoring

- [ ] Refactor `src/hooks/useCommentCounts.ts`
  - [ ] Use commentService instead of fetch
  - [ ] Add error state
  - [ ] Add invalidateCache() method
  - [ ] Remove in-memory cache (move to service)

- [ ] Refactor `src/hooks/useNewRequestsAndTasks.ts`
  - [ ] Use getRequests() service
  - [ ] Use getTasks() service
  - [ ] Add error state
  - [ ] Add updateCounts() callback

- [ ] Refactor `src/hooks/useViewedComments.ts`
  - [ ] Standardize pattern
  - [ ] Add error handling

### Constants Extraction

- [ ] Create `src/constants/status.ts`
  - [ ] STATUS_LABELS map (all statuses)
  - [ ] STATUS_COLORS map
  - [ ] STATUS_DOT map
  - [ ] STATUS_PILL_ACTIVE map

- [ ] Create `src/constants/modules.ts`
  - [ ] MODULE_LABELS map
  - [ ] MODULE_COLORS map
  - [ ] MODULE_DOT map
  - [ ] MODULE_PREFIXES map

- [ ] Create `src/constants/permissions.ts`
  - [ ] PERMISSION_NAMES enum
  - [ ] ROLE_PERMISSIONS mapping

### Sprint 3 Testing

- [ ] Run existing tests - should all pass
- [ ] Add tests for:
  - [ ] useRequestTable - sorting, filtering, resizing
  - [ ] useRequestStatus - status validation and updates
  - [ ] useAsync - success, error, loading states
  - [ ] useLocalStorage - read, write, SSR safety

**Deliverables**:
- 8+ new hooks created
- 3 hooks refactored with error handling
- Constants extracted to centralized files
- Tests passing at 90%+

---

## SPRINT 4: Components & Structure (Week 4 - 10 hours)

### Shared Component Extraction

- [ ] Create `src/components/common/RequestTable.tsx`
  - [ ] Props interface extending RequestTableProps
  - [ ] Reusable for all modules
  - [ ] Handles sorting, filtering, resizing
  - [ ] Inline status select support
  - [ ] Row expansion support
  - [ ] Comment count badges

- [ ] Create `src/components/common/StatCard.tsx`
  - [ ] Props: icon, label, value, color, onClick, isActive
  - [ ] Responsive sizing
  - [ ] Hover/active states

- [ ] Create `src/components/common/FilterPills.tsx`
  - [ ] Props: items, activeItem, onSelect
  - [ ] Status pills
  - [ ] Module pills
  - [ ] Color-coded pill backgrounds

- [ ] Create `src/components/common/SearchInput.tsx`
  - [ ] Placeholder support
  - [ ] Clear button
  - [ ] Debounced search prop

- [ ] Create `src/components/common/PageHeader.tsx`
  - [ ] Title, subtitle, action button layout
  - [ ] Reusable across all pages

### Page Component Refactoring

- [ ] Refactor `src/app/(dashboard)/shipping/page.tsx`
  - [ ] Remove duplicate constants (use imports)
  - [ ] Use useRequestTable hook
  - [ ] Use useRequestStatus hook
  - [ ] Use usePermissions hook
  - [ ] Replace table markup with <RequestTable />
  - [ ] Remove 150+ lines of table code

- [ ] Refactor remaining module pages (5 more):
  - [ ] maintenance/page.tsx
  - [ ] purchase/page.tsx
  - [ ] event/page.tsx
  - [ ] travel/page.tsx
  - [ ] hr/page.tsx

- [ ] Refactor `src/app/(dashboard)/admin/all-requests/page.tsx`
  - [ ] Remove duplicate constants
  - [ ] Use shared components
  - [ ] Use new hooks
  - [ ] Remove 200+ lines of code

### Sprint 4 Testing & Cleanup

- [ ] Update all imports in refactored pages
- [ ] Run full test suite - should all pass
- [ ] Delete duplicated constant definitions from pages
- [ ] Verify all module pages render correctly
- [ ] Performance profiling (should be similar or better)

**Deliverables**:
- 5 new shared components
- 8 pages refactored (reduced by 1000+ LOC total)
- All tests passing
- No breaking changes in UI

---

## SPRINT 5: Optional - Structure Reorganization (Week 5 - 12 hours)

### Directory Reorganization

- [ ] Create new directory structure:
  ```
  src/
  ├── components/
  │   ├── common/        (NEW - shared components)
  │   ├── forms/         (NEW - form components)
  │   ├── layout/        (existing)
  │   ├── request/       (existing)
  │   └── ui/            (existing)
  ├── constants/         (NEW)
  ├── hooks/             (existing, cleaned up)
  ├── modules/           (NEW - module implementations)
  │   ├── shipping/
  │   ├── maintenance/
  │   └── ...
  ├── services/
  │   ├── base/          (NEW)
  │   ├── request/       (NEW)
  │   ├── comment/       (NEW)
  │   ├── feedback/      (NEW - moved)
  │   ├── task/          (NEW - moved)
  │   ├── validation/    (NEW)
  │   ├── mock/          (NEW)
  │   └── persistence/   (NEW)
  └── types/             (NEW - centralized)
  ```

### Migration Steps

- [ ] Copy services to new locations (keep old files as re-exports)
- [ ] Update all imports throughout codebase
- [ ] Run tests after each import batch
- [ ] Keep old files as backward-compatible exports:
  ```typescript
  // src/services/engineService.ts (NEW)
  export { RequestService as default } from './request/requestService'
  export * from './request/requestService'
  ```

- [ ] Delete old monolithic service files after verification
- [ ] Delete old mock-data.ts file
- [ ] Update documentation

### Sprint 5 Testing & Verification

- [ ] Full test suite - 100% passing
- [ ] Manual testing of all module pages
- [ ] Performance audit (Lighthouse, React DevTools)
- [ ] Verify all features working:
  - [ ] Request creation
  - [ ] Status updates
  - [ ] Comment tracking
  - [ ] Feedback surveys
  - [ ] Team tasks
  - [ ] All permissions

**Deliverables**:
- Complete directory reorganization
- New modular structure
- All tests passing
- Documentation updated

---

## Final Verification Checklist

### Code Quality

- [ ] No remaining `any` types
- [ ] No remaining magic strings (localStorage keys, etc.)
- [ ] All functions have proper error handling
- [ ] All Zod schemas defined for request types
- [ ] 100% TypeScript strict mode compatible

### Testing

- [ ] Unit tests: >80% coverage
- [ ] Integration tests: All major flows tested
- [ ] E2E tests: Critical user journeys (if applicable)
- [ ] All existing tests passing
- [ ] New tests added for all services and hooks

### Performance

- [ ] No performance regression vs. baseline
- [ ] Component memoization where needed (React.memo, useMemo)
- [ ] Lazy loading for heavy components
- [ ] Bundle size similar or smaller

### Documentation

- [ ] README updated with new architecture
- [ ] Service layer documentation
- [ ] Hook usage examples
- [ ] Migration guide for team
- [ ] Common patterns document
- [ ] Type system documentation

### Deployment

- [ ] Branch ready for PR
- [ ] All checks passing (lint, type, tests)
- [ ] No console errors/warnings in dev
- [ ] No console errors in production build
- [ ] Staging deployment successful
- [ ] Production deployment successful

---

## Rollback Plan

If issues arise during implementation:

1. **Before Phase 1**: No rollback needed (only type definitions)
2. **After Phase 2**: Keep engineService as re-export from new services
3. **After Phase 3**: Hooks are additive, can keep old versions
4. **After Phase 4**: New components can coexist with old pages
5. **After Phase 5**: Full rollback to previous commit if needed

**Recommended**: Implement on feature branch, full integration testing before merge to main.

---

## Team Responsibilities

### Phase 1-2: Core Services (1 Developer)
- Types, domains, error handling
- Service modularization
- Persistence layer
- 10 hours

### Phase 2-3: Hooks & Validation (1-2 Developers)
- Hook standardization
- Validation infrastructure
- Constants extraction
- 16 hours total

### Phase 4-5: UI Components (1-2 Developers)
- Shared component extraction
- Page refactoring
- Structure reorganization
- 22 hours total

### Testing & QA (1 Developer - Ongoing)
- Unit test coverage
- Integration testing
- Performance verification
- 10 hours

---

## Success Metrics

After implementation, measure:

1. **Code Duplication**: From 2000 LOC → 600 LOC (70% reduction)
2. **Type Coverage**: From 30% → 95%+ (remove any types)
3. **Error Handling**: From 0% → 100% of operations
4. **Test Coverage**: From 40% → 80%+ (lines of code)
5. **Feature Development Time**: Reduce by 40-50%
6. **Bug-Related Comments in PR**: Reduce by 70%
7. **New Developer Onboarding**: From 2 weeks → 3 days

---

## Timeline Summary

| Week | Phase | Hours | Developers | Focus |
|------|-------|-------|-----------|-------|
| 1 | Sprint 1: Foundation | 20 | 1 | Types, errors, services |
| 2 | Sprint 2: Modularization | 20 | 1-2 | Service layer |
| 3 | Sprint 3: Logic & Hooks | 16 | 1-2 | Hooks, constants |
| 4 | Sprint 4: Components | 10 | 1-2 | UI extraction |
| 5 | Sprint 5: Structure (Optional) | 12 | 1-2 | Directory reorganization |
| **Total** | **All** | **78** | **1-2 devs** | **6 weeks max** |

---

## Known Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Breaking changes in API routes | Medium | High | Maintain backward compatibility wrappers |
| Performance regression | Low | Medium | Profile before/after using Lighthouse |
| Import cycle issues | Medium | Low | Keep circular dependency check in CI |
| Test failures during refactoring | High | Low | Add tests incrementally, maintain >90% passing |
| Team knowledge gap on new patterns | Medium | Medium | Code review, pair programming on first uses |

---

## Quick Start

To begin implementation:

1. Create branch: `git checkout -b refactor/architecture-improvement`
2. Start Sprint 1: Create types/ and constants/ directories
3. Commit after each logical unit (not each file)
4. Run tests frequently (`npm test` or similar)
5. Keep old services as re-exports during transition
6. Document decisions in PR description

**First commit**: "feat: Add foundational types and error handling (Phase 1)"

Good luck! This is a well-scoped, achievable refactoring that will significantly improve code quality and team velocity.
