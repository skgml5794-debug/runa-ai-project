import { uid } from "../async";
import { CategoryLimitError, normalizeCategoryName } from "../categories";
import { MAX_CATEGORIES } from "../constants";
import { removeCategoryFromNotes } from "../notes";
import type { Category, Note, NoteInput, NotePatch } from "../types";
import type { KeepnoteRepository } from "./types";

const NOTES_KEY = "keepnote:v1:notes";
const CATEGORIES_KEY = "keepnote:v1:categories";

function read<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export class LocalStorageRepository implements KeepnoteRepository {
  async listNotes(): Promise<Note[]> {
    return read<Note>(NOTES_KEY);
  }

  async listCategories(): Promise<Category[]> {
    return read<Category>(CATEGORIES_KEY);
  }

  async createNote(input: NoteInput): Promise<Note> {
    const now = new Date().toISOString();
    const note: Note = { ...input, id: uid(), createdAt: now, updatedAt: now };
    write(NOTES_KEY, [...read<Note>(NOTES_KEY), note]);
    return note;
  }

  async updateNote(id: string, patch: NotePatch): Promise<Note | null> {
    const notes = read<Note>(NOTES_KEY);
    const index = notes.findIndex((note) => note.id === id);
    if (index === -1) return null;
    const updated: Note = {
      ...notes[index],
      ...patch,
      // 최초 저장일은 수정해도 바뀌지 않는다.
      createdAt: notes[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    notes[index] = updated;
    write(NOTES_KEY, notes);
    return updated;
  }

  async deleteNote(id: string): Promise<void> {
    write(
      NOTES_KEY,
      read<Note>(NOTES_KEY).filter((note) => note.id !== id),
    );
  }

  async createCategory(name: string): Promise<Category> {
    if (read<Category>(CATEGORIES_KEY).length >= MAX_CATEGORIES) {
      throw new CategoryLimitError();
    }
    const category: Category = {
      id: uid(),
      name: normalizeCategoryName(name),
      createdAt: new Date().toISOString(),
    };
    write(CATEGORIES_KEY, [...read<Category>(CATEGORIES_KEY), category]);
    return category;
  }

  async renameCategory(id: string, name: string): Promise<void> {
    write(
      CATEGORIES_KEY,
      read<Category>(CATEGORIES_KEY).map((category) =>
        category.id === id
          ? { ...category, name: normalizeCategoryName(name) }
          : category,
      ),
    );
  }

  async deleteCategory(id: string): Promise<void> {
    write(
      CATEGORIES_KEY,
      read<Category>(CATEGORIES_KEY).filter((category) => category.id !== id),
    );
    write(NOTES_KEY, removeCategoryFromNotes(read<Note>(NOTES_KEY), id));
  }
}
