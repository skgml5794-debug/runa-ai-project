import { useSyncExternalStore } from "react";
import { isProfilePhoto } from "./thumbnail-url";
import type { Note } from "./types";

/**
 * 킵노트 썸네일 보관.
 * Instagram·Threads의 썸네일 주소는 며칠 뒤 만료되어(주소의 oe 값) 열리지 않는다.
 * 그래서 이미지를 작게 줄인 data 주소로 따로 보관한다. 킵노트 데이터(keepnote:v1:*)는 바꾸지 않고
 * 별도 키(keepnote:thumbs)에 킵노트 id별로 둔다.
 */
const THUMBS_KEY = "keepnote:thumbs";
const TRIED_KEY = "keepnote:thumbsTried";
/** 상세 화면 썸네일(144px)의 2배 */
const SIZE = 256;
const QUALITY = 0.8;
const FETCH_TIMEOUT_MS = 6_000;
/** 새 주소를 받아 보려다 실패한 킵노트는 이 시간이 지나야 다시 시도한다. */
const RETRY_AFTER_MS = 24 * 60 * 60 * 1000;
/** 한 번 방문에서 새 주소를 서버에 요청하는 최대 개수 (요청 제한 1분 10회보다 작게) */
const MAX_REFRESH_PER_SESSION = 8;

type Thumbs = Record<string, string>;

function readJson<T extends object>(key: string): T {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

function writeJson(key: string, value: object): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간이 가득 차거나 쓸 수 없으면 건너뛴다. 썸네일은 없어도 앱이 동작한다.
  }
}

const EMPTY: Thumbs = {};
let thumbs: Thumbs | null = null;
const listeners = new Set<() => void>();

function current(): Thumbs {
  if (thumbs === null) thumbs = readJson<Thumbs>(THUMBS_KEY);
  return thumbs;
}

function setThumbs(next: Thumbs): void {
  thumbs = next;
  writeJson(THUMBS_KEY, next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 보관해 둔 썸네일이 있으면 그것을, 없으면 노트에 저장된 원래 주소를 쓴다. */
export function useThumbnailSrc(id: string, original: string | null): string | null {
  const stored = useSyncExternalStore(subscribe, current, () => EMPTY);
  // 프로필 사진은 게시물 이미지가 아니므로 쓰지 않는다. (보관해 둔 것도 함께 무시한다.)
  if (isProfilePhoto(original)) return null;
  return stored[id] ?? original;
}

/** 이미지를 받아 정사각형으로 잘라 작은 JPEG data 주소로 만든다. 실패하면 null */
export async function compactThumbnail(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const bitmap = await createImageBitmap(await response.blob());
    const side = Math.min(bitmap.width, bitmap.height);
    const size = Math.min(SIZE, side);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
    bitmap.close();
    return canvas.toDataURL("image/jpeg", QUALITY);
  } catch {
    return null;
  }
}

async function requestFreshUrl(noteUrl: string): Promise<string | null> {
  try {
    const response = await fetch("/api/thumbnail", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: noteUrl }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { thumbnailUrl?: unknown };
    return typeof body.thumbnailUrl === "string" ? body.thumbnailUrl : null;
  } catch {
    return null;
  }
}

let running = false;
let latest: Note[] = [];
let refreshed = 0;

/**
 * 아직 보관하지 않은 킵노트의 썸네일을 작게 줄여 보관한다.
 * 저장된 주소가 아직 열리면 그대로 줄이고, 만료되었으면 게시물 링크에서 새 주소를 받아 줄인다.
 * 새로 저장한 킵노트도 주소가 살아 있는 동안 같은 방식으로 보관된다.
 */
export async function repairThumbnails(notes: Note[]): Promise<void> {
  latest = notes;
  if (running) return;
  running = true;
  try {
    // 삭제된 킵노트의 썸네일은 정리한다.
    const ids = new Set(notes.map((note) => note.id));
    const kept = Object.fromEntries(Object.entries(current()).filter(([id]) => ids.has(id)));
    if (Object.keys(kept).length !== Object.keys(current()).length) setThumbs(kept);

    for (;;) {
      const target = latest.find(
        (note) =>
          note.thumbnailUrl !== null &&
          !note.thumbnailUrl.startsWith("data:") &&
          !isProfilePhoto(note.thumbnailUrl) &&
          current()[note.id] === undefined &&
          !skipped.has(note.id),
      );
      if (!target) return;
      skipped.add(target.id);

      let compact = await compactThumbnail(target.thumbnailUrl as string);
      if (compact === null) {
        // 주소가 만료됨: 게시물 링크에서 새 주소를 받아 본다. (하루에 한 번까지만)
        const tried = readJson<Record<string, number>>(TRIED_KEY);
        if (refreshed >= MAX_REFRESH_PER_SESSION) continue;
        if (Date.now() - (tried[target.id] ?? 0) < RETRY_AFTER_MS) continue;
        refreshed += 1;
        writeJson(TRIED_KEY, { ...tried, [target.id]: Date.now() });
        const fresh = await requestFreshUrl(target.url);
        compact = fresh ? await compactThumbnail(fresh) : null;
      }
      if (compact !== null) setThumbs({ ...current(), [target.id]: compact });
    }
  } finally {
    running = false;
  }
}

/** 이번 방문에서 이미 처리해 본 킵노트(성공·실패 모두). 같은 방문에서 반복하지 않는다. */
const skipped = new Set<string>();
