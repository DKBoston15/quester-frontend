export interface Note {
  id: string;
  user_id: number;
  projectId: string;
  literatureId?: string;
  name: string;
  type: "LITERATURE" | "RESEARCH" | "BASE" | "QUICK";
  content: string;
  section_type:
    | {
        value: string;
        label: string;
      }
    | string;
  created_at: string;
  updated_at: string;
  createdAt: string;
  updatedAt: string;
}

export interface Literature {
  id: string;
  name: string;
  content?: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface NoteTag {
  id: string;
  note_id: string;
  tag_id: string;
  created_at: string;
  updated_at: string;
  tag: Tag;
}
