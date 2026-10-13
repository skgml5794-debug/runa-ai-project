import { LocalStorageRepository } from "./local-storage";
import type { KeepnoteRepository } from "./types";

/** 서버 DB로 교체할 때 이 값만 바꾼다. */
export const repository: KeepnoteRepository = new LocalStorageRepository();

export type { KeepnoteRepository } from "./types";
