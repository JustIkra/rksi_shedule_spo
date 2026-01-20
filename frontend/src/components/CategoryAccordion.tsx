import { FC, useState } from 'react';
import { CategoryWithEvents } from '../api/types';
import EventsTable from './EventsTable';

interface CategoryAccordionProps {
  category: CategoryWithEvents;
  defaultExpanded?: boolean;
  onUpdateDescription: (eventId: number, description: string | null) => Promise<void>;
  onAddLink: (eventId: number, url: string, title: string) => Promise<void>;
  onDeleteLink: (eventId: number, linkId: number) => Promise<void>;
  onUploadPhoto: (eventId: number, file: File) => Promise<void>;
  onDeletePhoto: (eventId: number, photoId: number) => Promise<void>;
  canEdit: boolean;
}

const CategoryAccordion: FC<CategoryAccordionProps> = ({
  category,
  defaultExpanded = true,
  onUpdateDescription,
  onAddLink,
  onDeleteLink,
  onUploadPhoto,
  onDeletePhoto,
  canEdit
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => setExpanded(!expanded);

  return (
    <div className="category">
      <div className="category-header" onClick={toggleExpanded}>
        <span className="category-arrow">{expanded ? '\u25BC' : '\u25B6'}</span>
        <span className="category-name">{category.name}</span>
        <span className="category-count">({category.events.length})</span>
      </div>

      {expanded && (
        <div className="category-content">
          <EventsTable
            events={category.events}
            onUpdateDescription={onUpdateDescription}
            onAddLink={onAddLink}
            onDeleteLink={onDeleteLink}
            onUploadPhoto={onUploadPhoto}
            onDeletePhoto={onDeletePhoto}
            canEdit={canEdit}
          />
        </div>
      )}
    </div>
  );
};

export default CategoryAccordion;
