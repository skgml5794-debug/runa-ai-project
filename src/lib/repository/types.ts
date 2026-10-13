import type { Category, Note, NoteInput, NotePatch } from "../types";

/**
 * 킵노트·카테고리 저장소 인터페이스.
 * MVP는 localStorage 구현을 쓰며, 서버 DB로 바꿀 때 이 인터페이스를 구현한다.
 */
export interface KeepnoteRepository {
  listNotes(): Promise<Note[]>;
  listCategories(): Promise<Category[]>;
  createNote(input: NoteInput): Promise<Note>;
  updateNote(id: string, patch: NotePatch): Promise<Note | null>;
  deleteNote(id: string): Promise<void>;
  createCategory(name: string): Promise<Category>;
  renameCategory(id: string, name: string): Promise<void>;
  /** 카테고리를 삭제하고 `removeCategoryFromNotes` 규칙을 킵노트에 적용한다. */
  deleteCategory(id: string): Promise<void>;
}
