import { CategoryLimitError } from "../categories";
import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorageRepository } from "../repository/local-storage";
import type { NoteInput } from "../types";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  clear() {
    this.data.clear();
  }
}

const input = (overrides: Partial<NoteInput> = {}): NoteInput => ({
  url: "https://instagram.com/p/a/",
  source: "Instagram",
  authorId: "tester",
  thumbnailUrl: null,
  title: "제목",
  summaryLines: ["하나", "둘", "셋"],
  keyInfo: [],
  originalText: "본문",
  categoryIds: [],
  ...overrides,
});

let repo: LocalStorageRepository;
let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  (globalThis as unknown as { window: unknown }).window = { localStorage: storage };
  repo = new LocalStorageRepository();
});

describe("LocalStorageRepository", () => {
  it("킵노트를 저장하고 다시 읽는다", async () => {
    const created = await repo.createNote(input());
    const list = await repo.listNotes();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: created.id, title: "제목" });
  });

  it("수정해도 최초 저장일은 바뀌지 않는다", async () => {
    const created = await repo.createNote(input());
    const updated = await repo.updateNote(created.id, {
      title: "새 제목",
      summaryLines: created.summaryLines,
      keyInfo: [],
      categoryIds: [],
    });
    expect(updated?.title).toBe("새 제목");
    expect(updated?.createdAt).toBe(created.createdAt);
  });

  it("없는 킵노트를 수정하면 null", async () => {
    expect(
      await repo.updateNote("missing", { title: "x", summaryLines: [], keyInfo: [], categoryIds: [] }),
    ).toBeNull();
  });

  it("킵노트를 삭제한다", async () => {
    const created = await repo.createNote(input());
    await repo.deleteNote(created.id);
    expect(await repo.listNotes()).toEqual([]);
  });

  it("카테고리 이름은 공백을 제거해 저장하고 이름 변경이 반영된다", async () => {
    const category = await repo.createCategory("  여행  ");
    expect(category.name).toBe("여행");
    await repo.renameCategory(category.id, " Trip ");
    expect((await repo.listCategories())[0].name).toBe("Trip");
  });

  it("카테고리 순서를 바꿔 저장하고, 목록에 없는 카테고리는 뒤에 둔다", async () => {
    const a = await repo.createCategory("A");
    const b = await repo.createCategory("B");
    const c = await repo.createCategory("C");
    await repo.reorderCategories([c.id, a.id]);
    expect((await repo.listCategories()).map((x) => x.name)).toEqual(["C", "A", "B"]);
    await repo.reorderCategories([b.id, c.id, a.id, "없는-id"]);
    expect((await repo.listCategories()).map((x) => x.name)).toEqual(["B", "C", "A"]);
  });

  it("카테고리는 최대 20개까지만 만들 수 있고, 21번째는 저장소에서 거부한다", async () => {
    for (let i = 1; i <= 20; i += 1) await repo.createCategory(`박스${i}`);
    await expect(repo.createCategory("박스21")).rejects.toThrow(CategoryLimitError);
    expect(await repo.listCategories()).toHaveLength(20);
    // 하나 지우면 다시 만들 수 있다.
    await repo.deleteCategory((await repo.listCategories())[0].id);
    await expect(repo.createCategory("박스21")).resolves.toMatchObject({ name: "박스21" });
  });

  it("카테고리를 삭제하면 킵노트는 모두 유지하고 해당 카테고리 분류만 제거한다(미분류로 이동)", async () => {
    const x = await repo.createCategory("X");
    const y = await repo.createCategory("Y");
    const onlyX = await repo.createNote(input({ title: "onlyX", categoryIds: [x.id] }));
    const both = await repo.createNote(input({ title: "both", categoryIds: [x.id, y.id] }));
    const none = await repo.createNote(input({ title: "none", categoryIds: [] }));

    await repo.deleteCategory(x.id);

    const notes = await repo.listNotes();
    expect(notes.map((n) => n.id).sort()).toEqual([both.id, none.id, onlyX.id].sort());
    expect(notes.find((n) => n.id === both.id)?.categoryIds).toEqual([y.id]);
    expect(notes.find((n) => n.id === onlyX.id)?.categoryIds).toEqual([]);
    expect((await repo.listCategories()).map((c) => c.id)).toEqual([y.id]);
  });

  it("저장된 데이터가 손상되어도 빈 목록으로 동작한다", async () => {
    storage.setItem("keepnote:v1:notes", "{broken");
    expect(await repo.listNotes()).toEqual([]);
  });
});
