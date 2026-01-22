# All Year View & Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add "Весь год" (All Year) tab before January and implement live search functionality across all event data.

**Architecture:** Frontend-focused with one backend endpoint addition. MonthTabs extended to support month=0 for "all year". New SearchInput component with debounced client-side filtering. Search filters across all visible event fields (name, responsible, location, description).

**Tech Stack:** React 18, TypeScript, FastAPI, CSS (existing design system variables)

---

## Task 1: Backend - Add All Events Endpoint

**Files:**
- Modify: `/Users/maksim/git_projects/rksi_shedule_spo/backend/app/api/events.py:25-80`
- Modify: `/Users/maksim/git_projects/rksi_shedule_spo/frontend/src/api/events.ts:4-8`

**Step 1: Write the backend endpoint for all events**

Add new endpoint in `backend/app/api/events.py` after line 80 (after `get_events_by_month`):

```python
@router.get(
    "/all",
    response_model=list[CategoryWithEvents],
    summary="Get all events for the year",
    description="Returns all categories with their events for the entire year. "
    "Categories are sorted by month first, then by sort_order within each month.",
)
async def get_all_events(
    db: DbSession,
) -> list[CategoryWithEvents]:
    """
    Get all events for the entire year, grouped by categories.

    Returns:
        List of categories with their events, including links and photos for each event.
    """
    stmt = (
        select(Category)
        .options(
            selectinload(Category.events).selectinload(Event.links),
            selectinload(Category.events).selectinload(Event.photos),
        )
        .order_by(Category.month, Category.sort_order)
    )

    result = await db.execute(stmt)
    categories = result.scalars().unique().all()

    response = []
    for category in categories:
        sorted_events = sorted(category.events, key=lambda e: e.sort_order)
        category_data = CategoryWithEvents(
            id=category.id,
            name=category.name,
            month=category.month,
            sort_order=category.sort_order,
            events=[
                EventWithRelations.model_validate(event)
                for event in sorted_events
            ],
        )
        response.append(category_data)

    return response
```

**Step 2: Test backend manually**

Run: `cd /Users/maksim/git_projects/rksi_shedule_spo/backend && uvicorn app.main:app --reload`

Then test: `curl http://localhost:8000/api/events/all | head -100`

Expected: JSON array of all categories with events

**Step 3: Add frontend API method**

In `frontend/src/api/events.ts`, add after line 7:

```typescript
  // Получить все мероприятия за год
  getAll: () =>
    api.get<CategoryWithEvents[]>('/events/all'),
```

**Step 4: Commit**

```bash
git add backend/app/api/events.py frontend/src/api/events.ts
git commit -m "$(cat <<'EOF'
feat: add endpoint for fetching all events

Add GET /events/all endpoint that returns all categories and events
for the entire year, sorted by month and sort_order.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Frontend - Update MonthTabs with "Весь год"

**Files:**
- Modify: `/Users/maksim/git_projects/rksi_shedule_spo/frontend/src/components/MonthTabs.tsx`
- Modify: `/Users/maksim/git_projects/rksi_shedule_spo/frontend/src/styles/components/MonthTabs.css`

**Step 1: Update MonthTabs component**

Replace the MONTHS array and add "Весь год" support:

```typescript
import { FC } from 'react';
import '../styles/components/MonthTabs.css';

const TABS = [
  { value: 0, label: 'Весь год' },
  { value: 1, label: 'Январь' },
  { value: 2, label: 'Февраль' },
  { value: 3, label: 'Март' },
  { value: 4, label: 'Апрель' },
  { value: 5, label: 'Май' },
  { value: 6, label: 'Июнь' },
  { value: 7, label: 'Июль' },
  { value: 8, label: 'Август' },
  { value: 9, label: 'Сентябрь' },
  { value: 10, label: 'Октябрь' },
  { value: 11, label: 'Ноябрь' },
  { value: 12, label: 'Декабрь' },
];

interface MonthTabsProps {
  selectedMonth: number;
  onMonthChange: (month: number) => void;
}

const MonthTabs: FC<MonthTabsProps> = ({ selectedMonth, onMonthChange }) => {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onMonthChange(Number(e.target.value));
  };

  return (
    <>
      {/* Desktop: Horizontal scrollable tabs */}
      <div
        className="month-tabs"
        role="tablist"
        aria-label="Выбор месяца"
      >
        {TABS.map(({ value, label }) => {
          const isActive = selectedMonth === value;
          const isAllYear = value === 0;

          return (
            <button
              key={value}
              role="tab"
              aria-selected={isActive}
              aria-controls={`month-panel-${value}`}
              tabIndex={isActive ? 0 : -1}
              className={`month-tabs__tab ${isActive ? 'month-tabs__tab--active' : ''} ${isAllYear ? 'month-tabs__tab--all-year' : ''}`}
              onClick={() => onMonthChange(value)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Mobile: Native select dropdown */}
      <div className="month-select">
        <label htmlFor="month-select-input" className="month-select__label">
          Выберите месяц
        </label>
        <select
          id="month-select-input"
          className="month-select__input"
          value={selectedMonth}
          onChange={handleSelectChange}
          aria-label="Выбор месяца"
        >
          {TABS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="month-select__icon" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </>
  );
};

export default MonthTabs;
```

**Step 2: Add CSS for "Весь год" tab styling**

Add to end of `MonthTabs.css` (before REDUCED MOTION section):

```css
/* ===========================================
   ALL YEAR TAB - Distinctive styling
   =========================================== */

.month-tabs__tab--all-year {
  background: var(--color-paper-muted);
  border: 1px solid var(--color-rule);
  font-weight: 600;
}

.month-tabs__tab--all-year:hover {
  background: var(--color-primary-muted);
  border-color: var(--color-primary-light);
}

.month-tabs__tab--all-year.month-tabs__tab--active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-paper);
}

.month-tabs__tab--all-year.month-tabs__tab--active:hover {
  background: var(--color-accent-light);
  border-color: var(--color-accent-light);
}
```

**Step 3: Verify visually**

Run: `cd /Users/maksim/git_projects/rksi_shedule_spo/frontend && npm run dev`

Expected: "Весь год" tab appears before January with distinct terracotta accent color when active

**Step 4: Commit**

```bash
git add frontend/src/components/MonthTabs.tsx frontend/src/styles/components/MonthTabs.css
git commit -m "$(cat <<'EOF'
feat: add "Весь год" (All Year) tab to month selector

- Add month value 0 for all-year view before January
- Distinctive terracotta accent color for all-year tab when active
- Works in both desktop tabs and mobile dropdown

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Frontend - Create SearchInput Component

**Files:**
- Create: `/Users/maksim/git_projects/rksi_shedule_spo/frontend/src/components/SearchInput.tsx`
- Create: `/Users/maksim/git_projects/rksi_shedule_spo/frontend/src/styles/components/SearchInput.css`

**Step 1: Create SearchInput component**

```typescript
import { FC, useState, useEffect, useRef, useCallback } from 'react';
import '../styles/components/SearchInput.css';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

const SearchInput: FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Поиск по мероприятиям...',
  debounceMs = 300,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const debouncedOnChange = useCallback(
    (newValue: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="search-input">
      <span className="search-input__icon" aria-hidden="true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <input
        type="text"
        className="search-input__field"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {localValue && (
        <button
          type="button"
          className="search-input__clear"
          onClick={handleClear}
          aria-label="Очистить поиск"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchInput;
```

**Step 2: Create SearchInput CSS**

```css
/**
 * SearchInput Component Styles
 *
 * Inline search field with icon and clear button.
 * Matches editorial design system.
 */

.search-input {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 400px;
}

.search-input__icon {
  position: absolute;
  left: var(--space-3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-muted);
  pointer-events: none;
  transition: color var(--transition-fast);
}

.search-input__field {
  width: 100%;
  min-height: var(--touch-target);
  padding: var(--space-2) var(--space-10) var(--space-2) var(--space-10);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-ink);
  background: var(--color-paper);
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-full);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast);
}

.search-input__field::placeholder {
  color: var(--color-ink-muted);
}

.search-input__field:hover {
  border-color: var(--color-primary-light);
}

.search-input__field:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-muted);
  background: var(--color-paper);
}

.search-input__field:focus + .search-input__icon,
.search-input:focus-within .search-input__icon {
  color: var(--color-primary);
}

.search-input__clear {
  position: absolute;
  right: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-full);
  color: var(--color-ink-muted);
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background-color var(--transition-fast);
}

.search-input__clear:hover {
  color: var(--color-ink);
  background: var(--color-paper-muted);
}

.search-input__clear:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* ===========================================
   RESPONSIVE
   =========================================== */

@media (max-width: 767px) {
  .search-input {
    max-width: none;
  }
}

/* ===========================================
   REDUCED MOTION
   =========================================== */

@media (prefers-reduced-motion: reduce) {
  .search-input__field,
  .search-input__icon,
  .search-input__clear {
    transition: none;
  }
}
```

**Step 3: Test component in isolation**

Import and render in EventsPage temporarily to verify styling.

**Step 4: Commit**

```bash
git add frontend/src/components/SearchInput.tsx frontend/src/styles/components/SearchInput.css
git commit -m "$(cat <<'EOF'
feat: create SearchInput component

Debounced search input with:
- Search icon on left
- Clear button when has value
- 300ms debounce by default
- Matches editorial design system

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Frontend - Integrate Search and All Year in EventsPage

**Files:**
- Modify: `/Users/maksim/git_projects/rksi_shedule_spo/frontend/src/pages/EventsPage.tsx`
- Modify: `/Users/maksim/git_projects/rksi_shedule_spo/frontend/src/styles/pages/EventsPage.css`

**Step 1: Update EventsPage with search and all-year support**

Replace entire EventsPage.tsx:

```typescript
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useIsMobile } from '../hooks/useMediaQuery';
import { eventsApi } from '../api/events';
import { CategoryWithEvents, EventWithRelations } from '../api/types';
import MonthTabs from '../components/MonthTabs';
import SearchInput from '../components/SearchInput';
import CategoryAccordion from '../components/CategoryAccordion';
import EventCard from '../components/EventCard';
import '../styles/pages/EventsPage.css';

// Helper to check if event matches search query
function eventMatchesSearch(event: EventWithRelations, query: string): boolean {
  const searchLower = query.toLowerCase();
  return (
    event.name.toLowerCase().includes(searchLower) ||
    (event.responsible?.toLowerCase().includes(searchLower) ?? false) ||
    (event.location?.toLowerCase().includes(searchLower) ?? false) ||
    (event.description?.toLowerCase().includes(searchLower) ?? false) ||
    (event.event_date?.toLowerCase().includes(searchLower) ?? false)
  );
}

function EventsPage() {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [categories, setCategories] = useState<CategoryWithEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load events based on selected month (0 = all year)
  const loadEvents = useCallback(async (month: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = month === 0
        ? await eventsApi.getAll()
        : await eventsApi.getByMonth(month);
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Не удалось загрузить мероприятия');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents(selectedMonth);
  }, [selectedMonth, loadEvents]);

  // Filter categories and events based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }

    return categories
      .map(category => ({
        ...category,
        events: category.events.filter(event => eventMatchesSearch(event, searchQuery)),
      }))
      .filter(category => category.events.length > 0);
  }, [categories, searchQuery]);

  // Count total matching events
  const matchingEventsCount = useMemo(() => {
    return filteredCategories.reduce((sum, cat) => sum + cat.events.length, 0);
  }, [filteredCategories]);

  // Handlers for EventRow
  const handleUpdateDescription = async (eventId: number, description: string | null) => {
    await eventsApi.updateDescription(eventId, description);
    setCategories(prev => prev.map(cat => ({
      ...cat,
      events: cat.events.map(event =>
        event.id === eventId ? { ...event, description } : event
      )
    })));
  };

  const handleAddLink = async (eventId: number, url: string, title: string) => {
    const response = await eventsApi.addLink(eventId, { url, title });
    const newLink = response.data;
    setCategories(prev => prev.map(cat => ({
      ...cat,
      events: cat.events.map(event =>
        event.id === eventId
          ? { ...event, links: [...event.links, newLink] }
          : event
      )
    })));
  };

  const handleDeleteLink = async (eventId: number, linkId: number) => {
    await eventsApi.deleteLink(eventId, linkId);
    setCategories(prev => prev.map(cat => ({
      ...cat,
      events: cat.events.map(event =>
        event.id === eventId
          ? { ...event, links: event.links.filter(l => l.id !== linkId) }
          : event
      )
    })));
  };

  const handleUploadPhoto = async (eventId: number, file: File) => {
    const response = await eventsApi.uploadPhoto(eventId, file);
    const { photos: newPhotos } = response.data;
    if (newPhotos && newPhotos.length > 0) {
      setCategories(prev => prev.map(cat => ({
        ...cat,
        events: cat.events.map(event =>
          event.id === eventId
            ? { ...event, photos: [...event.photos, ...newPhotos] }
            : event
        )
      })));
    }
  };

  const handleDeletePhoto = async (eventId: number, photoId: number) => {
    await eventsApi.deletePhoto(eventId, photoId);
    setCategories(prev => prev.map(cat => ({
      ...cat,
      events: cat.events.map(event =>
        event.id === eventId
          ? { ...event, photos: event.photos.filter(p => p.id !== photoId) }
          : event
      )
    })));
  };

  const canEdit = isAuthenticated === true;
  const pageTitle = isMobile ? 'План 2026' : 'План мероприятий СПО РО 2026';
  const isAllYear = selectedMonth === 0;

  if (isAuthenticated === null) {
    return (
      <div className="events-page">
        <div className="events-page__loading">
          <div className="events-page__loading-spinner" />
          <span className="events-page__loading-text">Проверка авторизации...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`events-page${isMobile ? ' events-page--mobile' : ''}`}>
      <header className="events-page__header">
        <h1 className="events-page__title">{pageTitle}</h1>
      </header>

      <MonthTabs
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      <div className="events-page__toolbar">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Поиск по названию, организации, месту..."
        />
        {searchQuery && !loading && (
          <span className="events-page__search-results">
            Найдено: {matchingEventsCount}
          </span>
        )}
      </div>

      <main className="events-page__content">
        {loading && (
          <div className="events-page__loading">
            <div className="events-page__loading-spinner" />
            <span className="events-page__loading-text">Загрузка...</span>
          </div>
        )}

        {error && (
          <div className="events-page__error">
            <div className="events-page__error-message">{error}</div>
            <button
              className="events-page__error-retry"
              onClick={() => loadEvents(selectedMonth)}
            >
              Повторить
            </button>
          </div>
        )}

        {!loading && !error && filteredCategories.length === 0 && (
          <div className="events-page__empty">
            <p className="events-page__empty-text">
              {searchQuery
                ? 'Ничего не найдено по вашему запросу'
                : isAllYear
                  ? 'Нет мероприятий за год'
                  : 'Нет мероприятий в этом месяце'}
            </p>
            {searchQuery && (
              <button
                className="events-page__empty-clear"
                onClick={() => setSearchQuery('')}
              >
                Сбросить поиск
              </button>
            )}
          </div>
        )}

        {!loading && !error && (
          <div className="events-page__categories">
            {isMobile ? (
              filteredCategories.map(category => (
                <div key={category.id} className="events-page__category-section">
                  <CategoryAccordion
                    category={category}
                    defaultExpanded={true}
                    onUpdateDescription={handleUpdateDescription}
                    onAddLink={handleAddLink}
                    onDeleteLink={handleDeleteLink}
                    onUploadPhoto={handleUploadPhoto}
                    onDeletePhoto={handleDeletePhoto}
                    canEdit={canEdit}
                    showMonth={isAllYear}
                    renderContent={() => (
                      <div className="events-page__cards">
                        {category.events.map(event => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onUpdateDescription={handleUpdateDescription}
                            onAddLink={handleAddLink}
                            onDeleteLink={handleDeleteLink}
                            onUploadPhoto={handleUploadPhoto}
                            onDeletePhoto={handleDeletePhoto}
                            canEdit={canEdit}
                          />
                        ))}
                      </div>
                    )}
                  />
                </div>
              ))
            ) : (
              filteredCategories.map(category => (
                <CategoryAccordion
                  key={category.id}
                  category={category}
                  defaultExpanded={true}
                  onUpdateDescription={handleUpdateDescription}
                  onAddLink={handleAddLink}
                  onDeleteLink={handleDeleteLink}
                  onUploadPhoto={handleUploadPhoto}
                  onDeletePhoto={handleDeletePhoto}
                  canEdit={canEdit}
                  showMonth={isAllYear}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default EventsPage;
```

**Step 2: Add CSS for toolbar and search results**

Add to `EventsPage.css` after the header section:

```css
/* ===========================================
   TOOLBAR (Search)
   =========================================== */

.events-page__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--container-gutter);
  background: var(--color-paper-warm);
  border-bottom: 1px solid var(--color-rule-light);
  max-width: var(--container-max);
  margin: 0 auto;
}

.events-page__search-results {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-ink-secondary);
  white-space: nowrap;
}

.events-page__empty-clear {
  margin-top: var(--space-4);
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.events-page__empty-clear:hover {
  background: var(--color-primary);
  color: var(--color-paper);
}

/* Mobile toolbar */
@media (max-width: 767px) {
  .events-page__toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }

  .events-page__search-results {
    text-align: center;
  }
}
```

**Step 3: Verify functionality**

1. Run frontend: `npm run dev`
2. Test "Весь год" tab loads all events
3. Test search filters events in real-time
4. Test search works on individual month tabs too
5. Test clear button resets search

**Step 4: Commit**

```bash
git add frontend/src/pages/EventsPage.tsx frontend/src/styles/pages/EventsPage.css
git commit -m "$(cat <<'EOF'
feat: integrate search and all-year view in EventsPage

- Support month=0 for fetching all events
- Add search toolbar below month tabs
- Client-side filtering across name, responsible, location, description
- Show count of matching results
- Empty state with "clear search" option

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Frontend - Update CategoryAccordion for Month Display

**Files:**
- Modify: `/Users/maksim/git_projects/rksi_shedule_spo/frontend/src/components/CategoryAccordion.tsx`
- Modify: `/Users/maksim/git_projects/rksi_shedule_spo/frontend/src/styles/components/CategoryAccordion.css`

**Step 1: Read current CategoryAccordion implementation**

First read the file to understand current structure.

**Step 2: Add showMonth prop to CategoryAccordion**

Add prop to interface:

```typescript
interface CategoryAccordionProps {
  category: CategoryWithEvents;
  defaultExpanded?: boolean;
  onUpdateDescription: (eventId: number, description: string | null) => Promise<void>;
  onAddLink: (eventId: number, url: string, title: string) => Promise<void>;
  onDeleteLink: (eventId: number, linkId: number) => Promise<void>;
  onUploadPhoto: (eventId: number, file: File) => Promise<void>;
  onDeletePhoto: (eventId: number, photoId: number) => Promise<void>;
  canEdit: boolean;
  renderContent?: () => React.ReactNode;
  showMonth?: boolean;  // Add this
}
```

**Step 3: Display month in accordion header when showMonth is true**

In the header render, add month badge:

```typescript
const MONTH_NAMES = [
  '', 'Январь', 'Февраль', 'Март', 'Апрель',
  'Май', 'Июнь', 'Июль', 'Август',
  'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// In the header JSX:
<div className="category-accordion__header-content">
  {showMonth && category.month && (
    <span className="category-accordion__month-badge">
      {MONTH_NAMES[category.month]}
    </span>
  )}
  <span className="category-accordion__title">{category.name}</span>
  <span className="category-accordion__count">({category.events.length})</span>
</div>
```

**Step 4: Add CSS for month badge**

```css
.category-accordion__month-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-paper);
  background: var(--color-primary);
  border-radius: var(--radius-sm);
  margin-right: var(--space-2);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}
```

**Step 5: Commit**

```bash
git add frontend/src/components/CategoryAccordion.tsx frontend/src/styles/components/CategoryAccordion.css
git commit -m "$(cat <<'EOF'
feat: add month badge to CategoryAccordion

Show month name badge in accordion header when showMonth=true.
Used in "All Year" view to distinguish categories from different months.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Final Testing and Polish

**Step 1: Run full test suite**

```bash
cd /Users/maksim/git_projects/rksi_shedule_spo/backend && python -m pytest -v
cd /Users/maksim/git_projects/rksi_shedule_spo/frontend && npm run lint && npm run build
```

**Step 2: Manual testing checklist**

- [ ] "Весь год" tab loads all events grouped by month
- [ ] Month badges appear in "All Year" view
- [ ] Search works on all tabs (including "Весь год")
- [ ] Search is instant (no page refresh)
- [ ] Search filters by: name, responsible, location, description, date
- [ ] Clear button resets search
- [ ] "Найдено: X" counter shows correct count
- [ ] Mobile view works correctly
- [ ] Empty state messages are correct

**Step 3: Fix any issues found**

Address any bugs or visual issues.

**Step 4: Final commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: polish all-year view and search feature

Final testing and minor fixes for:
- All year tab functionality
- Live search across all event fields
- Month badges in accordion headers

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Backend all-events endpoint | `events.py`, `events.ts` |
| 2 | MonthTabs with "Весь год" | `MonthTabs.tsx`, `MonthTabs.css` |
| 3 | SearchInput component | `SearchInput.tsx`, `SearchInput.css` |
| 4 | EventsPage integration | `EventsPage.tsx`, `EventsPage.css` |
| 5 | CategoryAccordion month badge | `CategoryAccordion.tsx`, `CategoryAccordion.css` |
| 6 | Testing and polish | Various |
