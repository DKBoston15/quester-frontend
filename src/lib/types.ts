export interface Note {
  id: string;
  user_id: string;
  project_id: string;
  literature_id?: string;
  name: string;
  type: "BASE" | "QUICK";
  content: string;
  section_type:
    | {
        value: string;
        label: string;
      }
    | string;
  created_at: string;
  updated_at: string;
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
