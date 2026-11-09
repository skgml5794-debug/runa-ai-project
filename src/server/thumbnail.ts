import "server-only";
import { fetchPostMeta } from "./post-meta";

/**
 * 저장된 게시물 링크에서 최신 썸네일 주소를 다시 읽는다.
 * Instagram·Threads 썸네일 주소는 서명과 만료 시각(oe)이 붙어 며칠 뒤 열리지 않으므로,
 * 요약할 때와 같은 방법(og:image)으로 새 주소를 받는다. 요약(Claude 호출)은 하지 않는다.
 */
export async function fetchFreshThumbnail(url: string): Promise<string | null> {
  const post = await fetchPostMeta(url);
  return post.thumbnailUrl;
}
