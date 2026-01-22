import { FC, useState, useId, useRef, useEffect, ReactNode } from 'react';
import { CategoryWithEvents } from '../api/types';
import EventsTable from './EventsTable';
import '../styles/components/CategoryAccordion.css';

const MONTH_NAMES = [
  '', 'Январь', 'Февраль', 'Март', 'Апрель',
  'Май', 'Июнь', 'Июль', 'Август',
  'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

interface CategoryAccordionProps {
  category: CategoryWithEvents;
  defaultExpanded?: boolean;
  onUpdateDescription: (eventId: number, description: string | null) => Promise<void>;
  onAddLink: (eventId: number, url: string, title: string) => Promise<void>;
  onDeleteLink: (eventId: number, linkId: number) => Promise<void>;
  onUploadPhoto: (eventId: number, file: File) => Promise<void>;
  onDeletePhoto: (eventId: number, photoId: number) => Promise<void>;
  canEdit: boolean;
  /** Optional render function for custom content (e.g., mobile card view) */
  renderContent?: () => ReactNode;
  /** Show month badge in header (for all-year view) */
  showMonth?: boolean;
}

const CategoryAccordion: FC<CategoryAccordionProps> = ({
  category,
  defaultExpanded = true,
  onUpdateDescription,
  onAddLink,
  onDeleteLink,
  onUploadPhoto,
  onDeletePhoto,
  canEdit,
  renderContent,
  showMonth = false
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
  const uniqueId = useId();
  const contentId = `category-accordion-content-${uniqueId}`;

  const toggleExpanded = () => setExpanded(!expanded);

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContentHeight(entry.contentRect.height);
        }
      });
      resizeObserver.observe(contentRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const blockClass = 'category-accordion';
  const expandedModifier = expanded ? `${blockClass}--expanded` : '';

  return (
    <div className={`${blockClass} ${expandedModifier}`.trim()}>
      <button
        type="button"
        className={`${blockClass}__header`}
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        <span className={`${blockClass}__arrow`} aria-hidden="true">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M4.5 2L9 6L4.5 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {showMonth && category.month && (
          <span className={`${blockClass}__month-badge`}>
            {MONTH_NAMES[category.month]}
          </span>
        )}
        <span className={`${blockClass}__name`}>{category.name}</span>
        <span className={`${blockClass}__count`}>({category.events.length})</span>
      </button>

      <div
        id={contentId}
        className={`${blockClass}__content`}
        style={{
          maxHeight: expanded ? (contentHeight ? `${contentHeight}px` : 'none') : '0px'
        }}
        aria-hidden={!expanded}
      >
        <div ref={contentRef} className={`${blockClass}__content-inner`}>
          {renderContent ? (
            renderContent()
          ) : (
            <EventsTable
              events={category.events}
              onUpdateDescription={onUpdateDescription}
              onAddLink={onAddLink}
              onDeleteLink={onDeleteLink}
              onUploadPhoto={onUploadPhoto}
              onDeletePhoto={onDeletePhoto}
              canEdit={canEdit}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryAccordion;
