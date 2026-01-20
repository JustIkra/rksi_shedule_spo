import { FC } from 'react';
import { EventWithRelations } from '../api/types';
import EventRow from './EventRow';

interface EventsTableProps {
  events: EventWithRelations[];
  onUpdateDescription: (eventId: number, description: string | null) => Promise<void>;
  onAddLink: (eventId: number, url: string, title: string) => Promise<void>;
  onDeleteLink: (eventId: number, linkId: number) => Promise<void>;
  onUploadPhoto: (eventId: number, file: File) => Promise<void>;
  onDeletePhoto: (eventId: number, photoId: number) => Promise<void>;
  canEdit: boolean;
}

const EventsTable: FC<EventsTableProps> = ({
  events,
  onUpdateDescription,
  onAddLink,
  onDeleteLink,
  onUploadPhoto,
  onDeletePhoto,
  canEdit
}) => {
  if (events.length === 0) {
    return <p className="no-events">Нет мероприятий</p>;
  }

  return (
    <table className="events-table">
      <thead>
        <tr>
          <th className="th-number">N п/п</th>
          <th className="th-name">Наименование мероприятия</th>
          <th className="th-date">Дата</th>
          <th className="th-responsible">Ответственные</th>
          <th className="th-location">Место</th>
          <th className="th-description">Пояснение</th>
          <th className="th-links">Ссылки</th>
          <th className="th-photos">Фото</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event, index) => (
          <EventRow
            key={event.id}
            event={event}
            index={index}
            onUpdateDescription={onUpdateDescription}
            onAddLink={onAddLink}
            onDeleteLink={onDeleteLink}
            onUploadPhoto={onUploadPhoto}
            onDeletePhoto={onDeletePhoto}
            canEdit={canEdit}
          />
        ))}
      </tbody>
    </table>
  );
};

export default EventsTable;
