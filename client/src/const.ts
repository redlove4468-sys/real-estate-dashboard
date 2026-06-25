export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// 로컬 로그인 페이지 경로 반환 (Manus OAuth 대신 자체 로그인 사용)
export const getLoginUrl = (_returnPath?: string) => '/login';
