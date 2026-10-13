/** 링크 수집·요약 단계별 실패. 라우트가 이 종류로 응답 코드를 나눈다. */

/** 게시물 페이지를 가져오지 못함 (네트워크, 오류 응답, 로그인 요구, 허용되지 않은 이동) */
export class FetchFailedError extends Error {
  constructor(message = "게시물을 가져오지 못했습니다.") {
    super(message);
    this.name = "FetchFailedError";
  }
}

/** 페이지는 가져왔지만 요약할 만한 내용이 없음 */
export class InsufficientContentError extends Error {
  constructor(message = "요약할 내용이 부족합니다.") {
    super(message);
    this.name = "InsufficientContentError";
  }
}

/** API 키 미설정 등 서버 설정 문제 */
export class NotConfiguredError extends Error {
  constructor(message = "API 키가 설정되지 않았습니다.") {
    super(message);
    this.name = "NotConfiguredError";
  }
}

/** Claude 호출 실패, 거절, 잘림, 형식 오류 */
export class AiFailedError extends Error {
  constructor(message = "AI 요약에 실패했습니다.") {
    super(message);
    this.name = "AiFailedError";
  }
}
