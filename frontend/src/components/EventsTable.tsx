import { FC } from 'react';
import { EventWithRelations } from '../api/types';
import EventRow from './EventRow';
import '../styles/components/EventsTable.css';

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
    return <p className="events-table__no-events">Нет мероприятий</p>;
  }

  return (
    <table className="events-table">
      <thead className="events-table__header">
        <tr className="events-table__header-row">
          <th className="events-table__header-cell events-table__header-cell--name">Наименование</th>
          <th className="events-table__header-cell events-table__header-cell--date">Дата</th>
          <th className="events-table__header-cell events-table__header-cell--responsible">Ответственные</th>
          <th className="events-table__header-cell events-table__header-cell--location">Место</th>
          <th className="events-table__header-cell events-table__header-cell--description">Пояснение</th>
          <th className="events-table__header-cell events-table__header-cell--links">Ссылки</th>
          <th className="events-table__header-cell events-table__header-cell--photos">Фото</th>
        </tr>
      </thead>
      <tbody className="events-table__body">
        {events.map((event) => (
          <EventRow
            key={event.id}
            event={event}
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
