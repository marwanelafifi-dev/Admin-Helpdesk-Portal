# Architecture Improvement - Dependency Graph & File Mapping

## Current State: Monolithic & Duplicated

```
engineService.ts (650 LOC)
├── CRUD logic (generateId, readAll, writeAll)
├── Status management
├── Comment tracking (recordCommentActivity)
├── Email simulation
├── Feedback survey integration
├── 300 lines of mock data initialization
└── No dependency injection

↓↓↓ DUPLICATED IN ↓↓↓

shipping/page.tsx (400 LOC)
├── Status constants (50 LOC)
├── Table logic (150 LOC)
├── Sorting/filtering (80 LOC)
└── Hardcoded API calls

maintenance/page.tsx (400 LOC)
├── Status constants (50 LOC) - DUPLICATE
├── Table logic (150 LOC) - DUPLICATE
├── Sorting/filtering (80 LOC) - DUPLICATE
└── Hardcoded API calls

[× 8 MORE PAGES WITH SAME PATTERN]

↓↓↓ SCATTERED DATA ACCESS ↓↓↓

useCommentCounts.ts
├── Hardcoded localStorage.getItem("...", "...")
├── In-memory singleton cache
└── No error handling

useNewRequestsAndTasks.ts
├── Hardcoded localStorage.getItem("admin_requests")
├── Hardcoded localStorage.getItem("admin_tasks")
└── No error handling

useViewedComments.ts
├── Hardcoded storage keys
└── No error handling
```

---

## Future State: Modular & Centralized

```
┌─────────────────────────────────────────────────────────────┐
│                    TYPE SYSTEM LAYER                         │
│  (src/types/domain.ts, services.ts, requests.ts)            │
│                                                               │
│  - RequestModule enum (SHIPPING, MAINTENANCE, etc.)         │
│  - RequestStatus enum (NEW, COMPLETED, etc.)                │
│  - IRequestService interface                                │
│  - ShippingRequest, MaintenanceRequest types                │
│  - AppError class                                            │
└─────────────────────────────────────────────────────────────┘
              ↑           ↑           ↑
              │           │           │
┌─────────────┼───────────┼───────────┼──────────────────────┐
│             │  SERVICE LAYER         │                      │
│ ┌───────────▼──────────────────────────────────────────┐   │
│ │         Base CRUD Service (Generics)                 │   │
│ │  - create(), update(), delete(), getAll(), getById() │   │
│ │  - Filtering, sorting, pagination                    │   │
│ │  - Abstract validate(), generateId()                │   │
│ └──────────────────────────────────────────────────────┘   │
│        ▲           ▲          ▲          ▲          ▲       │
│        │           │          │          │          │       │
│ ┌──────┴──┐ ┌─────┴──┐ ┌────┴─┐ ┌────┴──┐ ┌────┴──┐      │
│ │Shipping │ │Maint   │ │Purch │ │Event  │ │Travel │      │
│ │Service  │ │Service │ │Service│ │Service│ │Service│      │
│ └─────────┘ └────────┘ └──────┘ └───────┘ └───────┘      │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Cross-Cutting Services                              │   │
│ │  - StatusService (validation, rules)                │   │
│ │  - CommentService (extracted from engineService)    │   │
│ │  - FeedbackService (feedback surveys)               │   │
│ │  - TaskService (team tasks)                         │   │
│ │  - ValidationService (Zod schemas)                  │   │
│ │  - SeedDataService (mock data)                      │   │
│ └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
              ▲           ▲           ▲
              │           │           │
┌─────────────┼───────────┼───────────┼──────────────────────┐
│             │ PERSISTENCE LAYER      │                      │
│ ┌───────────▼──────────────────────────────────────────┐   │
│ │  IPersistenceProvider Interface                      │   │
│ │  - read<T>(key): T | null                            │   │
│ │  - write<T>(key, data): void                         │   │
│ │  - delete(key): void                                │   │
│ │  - clear(): void                                    │   │
│ └──────────────────────────────────────────────────────┘   │
│              ▲                                              │
│              │                                              │
│ ┌────────────┴──────────────────────────────────────────┐  │
│ │  LocalStorageAdapter (implements above)              │   │
│ │  - Automatically prefixes keys with 'arp_'          │   │
│ │  - Handles JSON parse/stringify errors              │   │
│ │  - SSR-safe (checks typeof window)                  │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
              ▲           ▲
              │           │
┌─────────────┴───────────┴──────────────────────────────────┐
│                    HOOKS LAYER                              │
│  (React Custom Hooks)                                       │
│                                                              │
│  useRequestTable(options)                                   │
│  ├── Returns: data, search, sortKey, sortDir, colWidths   │
│  └── Replaces 150 LOC of duplicated table logic           │
│                                                              │
│  useRequestStatus(initialStatus, module)                   │
│  ├── Uses StatusService for validation                     │
│  └── Handles error states properly                         │
│                                                              │
│  usePermissions()                                           │
│  ├── Extracts permission checks from session              │
│  └── Provides: canCreateRequest, canUpdateStatus, etc.    │
│                                                              │
│  useAsync<T>(asyncFn)                                       │
│  ├── Generic async operation handler                       │
│  └── Returns: data, loading, error, execute()             │
│                                                              │
│  useLocalStorage<T>(key, initialValue)                     │
│  ├── Type-safe localStorage wrapper                        │
│  └── Synchronizes with storage events                      │
│                                                              │
│  usePagination<T>(items, pageSize)                         │
│  └── Handles: goToPage, nextPage, prevPage                │
│                                                              │
│  useCommentCounts(requestIds) [REFACTORED]                │
│  ├── Uses commentService (not hardcoded localStorage)     │
│  ├── Proper error handling and loading states             │
│  └── Cache invalidation support                           │
└─────────────────────────────────────────────────────────────┘
              ▲           ▲
              │           │
┌─────────────┴───────────┴──────────────────────────────────┐
│                  COMPONENTS LAYER                           │
│  (Reusable UI Components)                                   │
│                                                              │
│  RequestTable (shared)                                      │
│  ├── Handles all table logic (sort, filter, resize)       │
│  └── Used by all 8 module pages                           │
│                                                              │
│  StatCard (shared)                                          │
│  ├── Standardized stat card rendering                      │
│  └── Used across all pages                                │
│                                                              │
│  FilterPills (shared)                                       │
│  ├── Status/module filter pills                            │
│  └── Replaces duplicated filter logic                     │
│                                                              │
│  InlineStatusSelect (existing, enhanced)                   │
│  ├── Now uses useRequestStatus hook                        │
│  └── Proper error handling                                │
│                                                              │
│  Module Pages [shipping, maintenance, purchase, etc.]      │
│  ├── Use shared hooks: useRequestTable, useRequestStatus  │
│  ├── Use shared components: RequestTable, StatCard        │
│  ├── Use shared constants: STATUS_LABELS, STATUS_COLORS   │
│  └── Reduced from 400 LOC → 100 LOC per page (75% less)  │
└─────────────────────────────────────────────────────────────┘
```

---

## File Dependency Map

### Current File Layout (Monolithic)

```
src/
├── services/
│   ├── engineService.ts (650 LOC - BLOATED)
│   │   ├── CRUD operations
│   │   ├── Status management
│   │   ├── Comment tracking
│   │   ├── Email simulation
│   │   ├── Feedback survey integration
│   │   └── 300 LOC mock data
│   │
│   ├── feedbackService.ts (137 LOC)
│   │   └── Survey CRUD
│   │
│   └── taskService.ts (179 LOC)
│       └── Team task CRUD
│
├── hooks/
│   ├── useCommentCounts.ts (97 LOC)
│   │   └── localStorage.getItem("comments") - MAGIC STRING
│   │
│   ├── useViewedComments.ts
│   │   └── localStorage access - MAGIC STRING
│   │
│   ├── useNewRequestsAndTasks.ts (72 LOC)
│   │   ├── localStorage.getItem("admin_requests") - MAGIC STRING
│   │   └── localStorage.getItem("admin_tasks") - MAGIC STRING
│   │
│   └── useExpandedRows.ts (26 LOC)
│       └── Simple state management
│
└── app/(dashboard)/
    ├── shipping/page.tsx (400+ LOC)
    │   ├── STATUS_LABELS, STATUS_COLORS, STATUS_DOT - DUPLICATE
    │   ├── 150 LOC table logic - DUPLICATE
    │   ├── Sorting/filtering - DUPLICATE
    │   └── Uses engineService directly
    │
    ├── maintenance/page.tsx (400+ LOC)
    │   ├── STATUS_LABELS... - DUPLICATE
    │   ├── 150 LOC table logic - DUPLICATE
    │   └── Uses engineService directly
    │
    ├── [6 more pages with identical pattern]
    │
    └── admin/all-requests/page.tsx (600+ LOC)
        ├── All status constants - DUPLICATE
        ├── Module-specific logic - DUPLICATE
        └── Uses engineService directly
```

### Future File Layout (Modular)

```
src/
├── types/ (NEW - CENTRALIZED)
│   ├── domain.ts
│   │   ├── RequestModule enum
│   │   ├── RequestStatus enum
│   │   └── MODULE_ALLOWED_STATUSES mapping
│   │
│   ├── services.ts
│   │   ├── IRequestService interface
│   │   ├── IPersistenceProvider interface
│   │   └── Other service interfaces
│   │
│   ├── requests.ts
│   │   ├── ShippingRequest type
│   │   ├── MaintenanceRequest type
│   │   └── Type guard functions (isShippingRequest, etc.)
│   │
│   ├── components.ts
│   │   ├── InlineStatusSelectProps
│   │   ├── RequestTableProps
│   │   └── StatCardProps
│   │
│   ├── errors.ts
│   │   ├── ErrorCode enum
│   │   └── AppError class
│   │
│   └── api.ts
│       ├── ApiResponse<T> interface
│       └── Error response shapes
│
├── constants/ (NEW - CENTRALIZED)
│   ├── status.ts
│   │   ├── STATUS_LABELS (for all statuses)
│   │   ├── STATUS_COLORS
│   │   ├── STATUS_DOT
│   │   └── STATUS_PILL_ACTIVE
│   │
│   ├── modules.ts
│   │   ├── MODULE_LABELS
│   │   ├── MODULE_COLORS
│   │   ├── MODULE_DOT
│   │   └── MODULE_PREFIXES
│   │
│   └── permissions.ts
│       ├── PERMISSION_NAMES enum
│       └── ROLE_PERMISSIONS mapping
│
├── services/ (REFACTORED)
│   ├── base/ (NEW)
│   │   ├── baseCrudService.ts
│   │   │   ├── Abstract create()
│   │   │   ├── Abstract update()
│   │   │   ├── Abstract delete()
│   │   │   ├── Abstract getAll()
│   │   │   └── Abstract getById()
│   │   │
│   │   └── baseRepository.ts (optional)
│   │
│   ├── request/ (NEW - EXTRACTED FROM engineService)
│   │   ├── requestService.ts
│   │   │   ├── Extends BaseCrudService
│   │   │   ├── CRUD for generic requests
│   │   │   └── ~150 LOC
│   │   │
│   │   ├── statusService.ts
│   │   │   ├── validateTransition()
│   │   │   ├── isTerminalStatus()
│   │   │   └── isActiveStatus()
│   │   │
│   │   ├── shippingService.ts
│   │   │   ├── Extends BaseCrudService<ShippingRequest>
│   │   │   ├── Shipping-specific validate()
│   │   │   └── getByCarrier()
│   │   │
│   │   ├── maintenanceService.ts
│   │   │   ├── Extends BaseCrudService<MaintenanceRequest>
│   │   │   ├── Maintenance-specific validate()
│   │   │   └── getByPriority()
│   │   │
│   │   ├── purchaseService.ts
│   │   ├── eventService.ts
│   │   ├── travelService.ts
│   │   ├── hrService.ts
│   │   └── index.ts (barrel export)
│   │
│   ├── comment/ (NEW - EXTRACTED FROM engineService)
│   │   ├── commentService.ts
│   │   │   ├── recordCommentActivity()
│   │   │   ├── getCommentsByRequest()
│   │   │   └── getUnreadCommentCount()
│   │   │
│   │   └── commentRepository.ts
│   │
│   ├── feedback/ (MOVED)
│   │   ├── feedbackService.ts (no changes)
│   │   └── feedbackRepository.ts
│   │
│   ├── task/ (MOVED)
│   │   ├── taskService.ts (no changes)
│   │   └── taskRepository.ts
│   │
│   ├── validation/ (NEW)
│   │   ├── validationService.ts
│   │   │   ├── validate()
│   │   │   ├── validators object
│   │   │   └── Module-specific schemas
│   │   │
│   │   └── schemas/ (optional, if many)
│   │
│   ├── notification/ (NEW)
│   │   └── notificationService.ts
│   │       ├── notifyStatusChange()
│   │       ├── notifyCancellation()
│   │       └── notifyApproval()
│   │
│   ├── persistence/ (NEW)
│   │   ├── localStorageAdapter.ts
│   │   │   └── Implements IPersistenceProvider
│   │   │
│   │   └── persistenceFactory.ts (optional)
│   │       └── Creates adapter instances
│   │
│   ├── mock/ (NEW)
│   │   └── seedDataService.ts
│   │       ├── initialize()
│   │       ├── generateMockData()
│   │       └── reset()
│   │
│   ├── engineService.ts (REFACTORED - now just re-exports)
│   │   ├── export { RequestService } from './request/requestService'
│   │   ├── export { StatusService } from './request/statusService'
│   │   └── (backward compatibility)
│   │
│   └── index.ts (barrel export)
│       ├── export all services
│       └── export service factory
│
├── hooks/ (STANDARDIZED)
│   ├── useRequestTable.ts (NEW)
│   │   └── Returns: data, search, sortKey, sortDir, colWidths
│   │
│   ├── useRequestStatus.ts (NEW)
│   │   └── Returns: status, loading, error, updateStatus()
│   │
│   ├── usePermissions.ts (REFACTORED)
│   │   └── Returns: canCreate, canUpdate, canDelete, etc.
│   │
│   ├── useAsync.ts (NEW)
│   │   └── Generic async operation handler
│   │
│   ├── useLocalStorage.ts (NEW)
│   │   └── Type-safe localStorage wrapper
│   │
│   ├── usePagination.ts (NEW)
│   │   └── Returns: currentPage, totalPages, currentItems, etc.
│   │
│   ├── useErrorHandler.ts (NEW)
│   │   └── Error display and handling
│   │
│   ├── useLoadingState.ts (NEW)
│   │   └── Debounced loading state
│   │
│   ├── useCommentCounts.ts (REFACTORED)
│   │   ├── Uses commentService (not localStorage)
│   │   ├── Proper error handling
│   │   └── Cache invalidation support
│   │
│   ├── useViewedComments.ts (REFACTORED)
│   │   └── Standardized error handling
│   │
│   ├── useNewRequestsAndTasks.ts (REFACTORED)
│   │   ├── Uses getRequests() service
│   │   ├── Uses getTasks() service
│   │   └── Proper error handling
│   │
│   └── useExpandedRows.ts (existing)
│       └── No changes needed
│
├── components/ (ENHANCED)
│   ├── common/ (NEW)
│   │   ├── RequestTable.tsx
│   │   │   └── Replaces 150 LOC in each page
│   │   │
│   │   ├── StatCard.tsx
│   │   │   └── Standardized stat card
│   │   │
│   │   ├── FilterPills.tsx
│   │   │   └── Status/module filters
│   │   │
│   │   ├── SearchInput.tsx
│   │   │   └── Debounced search
│   │   │
│   │   └── PageHeader.tsx
│   │       └── Title, subtitle, action button
│   │
│   ├── forms/ (NEW)
│   │   ├── RequestForm.tsx
│   │   ├── ShippingForm.tsx
│   │   ├── MaintenanceForm.tsx
│   │   └── ... (other module forms)
│   │
│   ├── layout/ (existing)
│   │   └── Sidebar, Header, etc.
│   │
│   ├── request/ (existing)
│   │   └── Request-specific components
│   │
│   └── ui/ (existing)
│       ├── InlineStatusSelect.tsx (ENHANCED)
│       │   └── Uses useRequestStatus hook
│       │
│       └── ... (other UI primitives)
│
└── app/(dashboard)/ (SIMPLIFIED PAGES)
    ├── shipping/page.tsx (100 LOC, down from 400)
    │   ├── Uses useRequestTable()
    │   ├── Uses useRequestStatus()
    │   ├── Uses usePermissions()
    │   ├── Uses shared <RequestTable /> component
    │   ├── Imports constants from src/constants/status
    │   └── No duplicated logic
    │
    ├── maintenance/page.tsx (100 LOC)
    │   └── Same pattern as shipping
    │
    ├── purchase/page.tsx (100 LOC)
    │   └── Same pattern as shipping
    │
    ├── event/page.tsx (100 LOC)
    │   └── Same pattern as shipping
    │
    ├── travel/page.tsx (100 LOC)
    │   └── Same pattern as shipping
    │
    ├── hr/page.tsx (150 LOC)
    │   ├── Same pattern + HR-specific form
    │   └── Tabs for Onboarding/Offboarding
    │
    ├── shipping/receiving/page.tsx (100 LOC)
    │   └── Uses shared table component
    │
    ├── admin/all-requests/page.tsx (200 LOC, down from 600)
    │   ├── Uses useRequestTable()
    │   ├── Uses shared <RequestTable /> component
    │   ├── Module-specific status handling
    │   └── Team tasks integration
    │
    ├── dashboard/page.tsx (existing)
    │   └── No changes needed (already good)
    │
    ├── feedback-reports/page.tsx (existing)
    │   └── No changes needed
    │
    ├── tasks/page.tsx (existing)
    │   └── No changes needed
    │
    └── requests/page.tsx (100 LOC)
        ├── Uses useRequestTable()
        ├── Uses shared <RequestTable /> component
        └── User-scoped request view
```

---

## Dependency Graph: Before & After

### BEFORE: Tangled Dependencies

```
shipping/page.tsx
  ├── imports engineService.ts ──────┐
  ├── imports feedbackService.ts     │
  ├── imports updateStatus           │
  └── hardcodes STATUS_LABELS        │
                                     │
maintenance/page.tsx ────────────────┤
  ├── imports engineService.ts       │
  ├── imports feedbackService.ts     ├──→ engineService.ts (650 LOC)
  ├── imports updateStatus           │
  └── hardcodes STATUS_LABELS        │      ├── localStorage.getItem("arp_requests")
                                     │      ├── localStorage.getItem("arp_mock_version")
[× 8 more pages]                     │      ├── generateId() logic
                                     │      ├── Feedback survey creation
  └─────────────────────────────────┘      ├── Email simulation
                                            └── 300 LOC mock data

useCommentCounts.ts
  └── localStorage.getItem("comments_viewed")

useNewRequestsAndTasks.ts
  ├── localStorage.getItem("admin_requests")
  └── localStorage.getItem("admin_tasks")

Problem: Every page duplicates table logic, every hook hardcodes storage keys,
engineService handles too many concerns, no dependency injection possible
```

### AFTER: Clear Separation

```
shipping/page.tsx
  ├── imports useRequestTable() ─────┐
  ├── imports useRequestStatus()     │
  ├── imports usePermissions()       ├──→ hooks/ (thin, composable)
  ├── imports STATUS_COLORS          │
  └── imports STATUS_LABELS          │     ├── useRequestTable
                                     │     ├── useRequestStatus
maintenance/page.tsx ────────────────┤     ├── usePermissions
  └── [same pattern]                 │     └── useAsync
                                     │
[× 6 more pages] ──────────────────┐ │
                                   │ │
                                   ↓ ↓
                            ┌─────────────────────┐
                            │   HOOKS LAYER       │
                            │                     │
                            │  useRequestTable()  │
                            │   ├→ data          │
                            │   └→ controls      │
                            │                     │
                            │  useRequestStatus()│
                            │   ├→ validates     │
                            │   └→ errorHandles  │
                            │                     │
                            │  usePermissions()  │
                            │   └→ perms check   │
                            └──────────┬──────────┘
                                       │
                                       ↓
                            ┌──────────────────────┐
                            │  SERVICES LAYER      │
                            │                      │
                            │ StatusService        │
                            │  └→ validate()      │
                            │                      │
                            │ RequestService      │
                            │  └→ CRUD            │
                            │                      │
                            │ ShippingService     │
                            │  └→ module logic    │
                            │                      │
                            │ CommentService      │
                            │  └→ comment logic   │
                            │                      │
                            │ ValidationService   │
                            │  └→ Zod schemas    │
                            └──────────┬──────────┘
                                       │
                                       ↓
                            ┌──────────────────────┐
                            │ PERSISTENCE LAYER    │
                            │                      │
                            │ LocalStorageAdapter  │
                            │  └→ read/write/del   │
                            └──────────┬──────────┘
                                       │
                                       ↓
                            ┌──────────────────────┐
                            │  localStorage        │
                            │  (browser API)       │
                            └──────────────────────┘

Benefit: Each layer has single responsibility, testable, mockable,
composable, and centralized
```

---

## Import Path Changes

### Status Constants Example

**BEFORE (Duplicated in 10 files)**:
```typescript
// src/app/(dashboard)/shipping/page.tsx
const STATUS_LABELS: Record<string, string> = {
  new: "New", in_progress: "In Progress", delivered: "Delivered", ...
}

// src/app/(dashboard)/maintenance/page.tsx
const STATUS_LABELS: Record<string, string> = {
  new: "New", on_hold: "In Progress", completed: "Completed", ...
}
```

**AFTER (Centralized)**:
```typescript
// src/app/(dashboard)/shipping/page.tsx
import { STATUS_LABELS, STATUS_COLORS } from '@/constants/status'
import { MODULE_ALLOWED_STATUSES } from '@/types/domain'

// Use with enums:
const allowedStatuses = MODULE_ALLOWED_STATUSES[RequestModule.SHIPPING]
```

### Service Usage Example

**BEFORE**:
```typescript
// Direct localStorage access scattered everywhere
const requests = JSON.parse(localStorage.getItem('arp_requests') || '[]')
```

**AFTER**:
```typescript
import { getRequests } from '@/services/request/requestService'

const requests = getRequests()
  .filter(r => r.status === RequestStatus.NEW)
  .filter(r => r.module === RequestModule.SHIPPING)
```

### Component Props Example

**BEFORE**:
```typescript
// Props type not specified, any implied
export function InlineStatusSelect({
  currentStatus,
  statuses,
  statusColors,
  statusDot,
  statusLabels,
  onStatusChange,
  disabled = false,
  canUpdateStatus = true,
}): JSX.Element
```

**AFTER**:
```typescript
import type { InlineStatusSelectProps } from '@/types/components'

export function InlineStatusSelect(props: InlineStatusSelectProps): JSX.Element {
  const { currentStatus, allowedStatuses, onStatusChange, ... } = props
}
```

---

## Circular Dependency Prevention

### Bad Pattern (would create circular dependency):

```
services/request/requestService.ts
  ├→ imports services/feedback/feedbackService.ts
  └─ exports EngineRequest

services/feedback/feedbackService.ts
  ├→ imports services/request/requestService.ts
  └─ exports FeedbackSurvey
```

### Good Pattern (uses events/callbacks):

```
services/request/statusService.ts
  └─ exports validateTransition()

services/request/requestService.ts
  ├─ imports statusService
  └─ uses statusService.validateTransition()

components/InlineStatusSelect.tsx
  └─ uses useRequestStatus() hook
  └─ which uses requestService
  └─ which uses statusService

No circular dependencies!
```

### Checking for Circular Dependencies:

Add to CI/CD:
```bash
# Using madge
madge --extensions ts,tsx src/ --circular
```

---

## Import Organization Standards

After refactoring, maintain this import order in all files:

```typescript
// 1. External libraries
import React, { useState } from 'react'
import { useSession } from 'next-auth/react'

// 2. Internal types
import type { EngineRequest, RequestStatus } from '@/services/engineService'
import type { InlineStatusSelectProps } from '@/types/components'
import { RequestModule, RequestStatus as Status } from '@/types/domain'

// 3. Services
import { requestService } from '@/services/request/requestService'
import { statusService } from '@/services/request/statusService'

// 4. Hooks
import { useRequestTable } from '@/hooks/useRequestTable'
import { useRequestStatus } from '@/hooks/useRequestStatus'

// 5. Components
import { RequestTable } from '@/components/common/RequestTable'
import { StatCard } from '@/components/common/StatCard'
import { Card } from '@/components/ui/card'

// 6. Utilities & constants
import { STATUS_LABELS, STATUS_COLORS } from '@/constants/status'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/formatters'
```

---

## Migration Impact Matrix

| Layer | Current | Future | Impact | Breaking? |
|-------|---------|--------|--------|-----------|
| Type System | Minimal | Comprehensive | Better DX, fewer runtime errors | No |
| Service Layer | Monolithic | Modular | Easier testing, clearer concerns | No* |
| Hooks | Scattered | Standardized | Reusability, consistency | No |
| Components | Duplicated | Extracted | 1000+ LOC savings | No |
| Constants | Duplicated | Centralized | Single source of truth | No |
| Testing | Limited | Comprehensive | 80%+ coverage achievable | N/A |

*"No" if done with backward compatibility wrappers

---

## Success Verification Checklist

After completing refactoring, verify:

- [ ] All imports use new paths (no old paths remain)
- [ ] No `any` types (use strict mode)
- [ ] No magic strings (all constants centralized)
- [ ] All services have tests (unit or integration)
- [ ] All hooks have tests or storybook entries
- [ ] All pages use shared components
- [ ] Bundle size similar or smaller
- [ ] No circular dependencies detected
- [ ] 100% of existing tests passing
- [ ] New tests added for all new code
- [ ] TypeScript strict mode compatible
- [ ] No console warnings or errors in dev
- [ ] No console warnings or errors in prod build
- [ ] Lighthouse scores maintained or improved
- [ ] All features working identically to before

**Total Verification Time**: 2-3 hours

---

## Quick Reference: New Imports After Refactoring

```typescript
// Types
import type { EngineRequest, RequestStatus } from '@/services/engineService'
import { RequestModule, RequestStatus as Status } from '@/types/domain'
import type { ShippingRequest } from '@/types/requests'

// Services
import { requestService } from '@/services/request/requestService'
import { shippingService } from '@/services/request/shippingService'
import { statusService } from '@/services/request/statusService'
import { commentService } from '@/services/comment/commentService'

// Hooks
import { useRequestTable } from '@/hooks/useRequestTable'
import { useRequestStatus } from '@/hooks/useRequestStatus'
import { usePermissions } from '@/hooks/usePermissions'
import { useAsync } from '@/hooks/useAsync'

// Components
import { RequestTable } from '@/components/common/RequestTable'
import { StatCard } from '@/components/common/StatCard'
import { FilterPills } from '@/components/common/FilterPills'
import { InlineStatusSelect } from '@/components/ui/InlineStatusSelect'

// Constants
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT } from '@/constants/status'
import { MODULE_LABELS, MODULE_COLORS, MODULE_PREFIXES } from '@/constants/modules'
import { PERMISSION_NAMES } from '@/constants/permissions'
```

This document serves as the complete reference for how code is organized after refactoring.
