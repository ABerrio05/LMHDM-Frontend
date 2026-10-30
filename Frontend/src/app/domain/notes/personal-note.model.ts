export interface PersonalNote {
  id: number;
  title: string;
  content: string;
  ownerId: number;
  createdAt: string;
}

export interface NoteRequest {
  title: string;
  content: string;
}
