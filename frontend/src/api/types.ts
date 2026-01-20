// Auth
export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

// Category
export interface Category {
  id: number;
  name: string;
  month: number;
  sort_order: number;
}

export interface CategoryWithEvents extends Category {
  events: EventWithRelations[];
}

// Event
export interface Event {
  id: number;
  category_id: number;
  number: string | null;
  name: string;
  event_date: string | null;
  responsible: string | null;
  location: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface EventWithRelations extends Event {
  links: Link[];
  photos: Photo[];
}

// Link
export interface Link {
  id: number;
  event_id: number;
  url: string;
  title: string | null;
  created_at: string;
}

export interface LinkCreate {
  url: string;
  title?: string;
}

// Photo
export interface Photo {
  id: number;
  event_id: number;
  filename: string;
  original_path: string;
  thumbnail_path: string;
  file_size: number;
  created_at: string;
}
