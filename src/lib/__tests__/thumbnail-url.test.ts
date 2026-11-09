import { describe, expect, it } from "vitest";
import { isProfilePhoto } from "../thumbnail-url";

describe("isProfilePhoto", () => {
  it("경로 끝이 -19인 CDN 주소는 프로필 사진", () => {
    expect(isProfilePhoto("https://scontent.cdninstagram.com/v/t51.2885-19/1_n.jpg?oe=1")).toBe(true);
    expect(isProfilePhoto("https://scontent.cdninstagram.com/v/t51.82787-19/1_n.jpg")).toBe(true);
  });

  it("게시물 이미지(-15)와 다른 주소, null은 프로필 사진이 아니다", () => {
    expect(isProfilePhoto("https://scontent.cdninstagram.com/v/t51.82787-15/1_n.jpg")).toBe(false);
    expect(isProfilePhoto("https://scontent.cdninstagram.com/v/t51.71878-15/1_n.jpg")).toBe(false);
    expect(isProfilePhoto("data:image/jpeg;base64,AAAA")).toBe(false);
    expect(isProfilePhoto(null)).toBe(false);
  });
});
