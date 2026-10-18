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
  /** 카테고리를 삭제하고, 소속 킵노트는 유지한 채 분류만 제거한다(미분류가 됨). */
  deleteCategory(id: string): Promise<void>;
  /** 주어진 id 순서대로 카테고리 순서를 저장한다. 목록에 없는 카테고리는 뒤에 그대로 둔다. */
  reorderCategories(ids: string[]): Promise<void>;
}
