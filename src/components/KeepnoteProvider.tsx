"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { repository } from "@/lib/repository";
import type { Category, Note, NoteInput, NotePatch } from "@/lib/types";

interface KeepnoteContextValue {
  /** 저장소에서 처음 읽어오기 전까지 false */
  ready: boolean;
  notes: Note[];
  categories: Category[];
  addNote(input: NoteInput): Promise<Note>;
  updateNote(id: string, patch: NotePatch): Promise<void>;
  deleteNote(id: string): Promise<void>;
  /** 이름 순서대로 카테고리를 만들고 입력 순서대로 결과를 돌려준다. */
  addCategories(names: string[]): Promise<Category[]>;
  renameCategory(id: string, name: string): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  /** 킵박스 순서를 저장한다. 화면에는 바로 반영한다. */
  reorderCategories(ids: string[]): Promise<void>;
}

const KeepnoteContext = createContext<KeepnoteContextValue | null>(null);

export function KeepnoteProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const reload = useCallback(async () => {
    const [nextNotes, nextCategories] = await Promise.all([
      repository.listNotes(),
      repository.listCategories(),
    ]);
    setNotes(nextNotes);
    setCategories(nextCategories);
    setReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([repository.listNotes(), repository.listCategories()]).then(
      ([nextNotes, nextCategories]) => {
        if (!active) return;
        setNotes(nextNotes);
        setCategories(nextCategories);
        setReady(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<KeepnoteContextValue>(
    () => ({
      ready,
      notes,
      categories,
      async addNote(input) {
        const note = await repository.createNote(input);
        await reload();
        return note;
      },
      async updateNote(id, patch) {
        await repository.updateNote(id, patch);
        await reload();
      },
      async deleteNote(id) {
        await repository.deleteNote(id);
        await reload();
      },
      async addCategories(names) {
        const created: Category[] = [];
        for (const name of names) {
          created.push(await repository.createCategory(name));
        }
        await reload();
        return created;
      },
      async renameCategory(id, name) {
        await repository.renameCategory(id, name);
        await reload();
      },
      async deleteCategory(id) {
        await repository.deleteCategory(id);
        await reload();
      },
      async reorderCategories(ids) {
        // 놓는 순간 목록이 되돌아가 보이지 않도록 먼저 화면 순서를 바꾼다.
        setCategories((previous) => {
          const byId = new Map(previous.map((category) => [category.id, category]));
          const ordered = ids.flatMap((id) => byId.get(id) ?? []);
          return [...ordered, ...previous.filter((category) => !ids.includes(category.id))];
        });
        await repository.reorderCategories(ids);
        await reload();
      },
    }),
    [ready, notes, categories, reload],
  );

  return (
    <KeepnoteContext.Provider value={value}>{children}</KeepnoteContext.Provider>
  );
}

export function useKeepnote(): KeepnoteContextValue {
  const context = useContext(KeepnoteContext);
  if (!context) {
    throw new Error("useKeepnote must be used within KeepnoteProvider");
  }
  return context;
}
