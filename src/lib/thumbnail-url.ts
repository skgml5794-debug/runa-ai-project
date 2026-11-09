/**
 * Instagram·Threads CDN 주소의 종류. 경로의 마지막 숫자가 19면 계정 프로필 사진, 15면 게시물 이미지다.
 * 글만 있는 Threads 게시물은 og:image가 작성자 프로필 사진이라, 이런 주소는 썸네일로 쓰지 않는다.
 */
const PROFILE_PHOTO = /\/t51\.\d+-19\//;

export function isProfilePhoto(url: string | null): boolean {
  return url !== null && PROFILE_PHOTO.test(url);
}
