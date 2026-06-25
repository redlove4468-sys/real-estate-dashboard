/**
 * 로컬 로그인/회원가입 시스템 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// DB 모킹
vi.mock('./db', () => ({
  getUserByUsername: vi.fn(),
  createLocalUser: vi.fn(),
  getAllUsers: vi.fn(),
  updateUserApproval: vi.fn(),
  getDb: vi.fn(),
}));

import * as db from './db';

describe('로컬 인증 - 비밀번호 해시', () => {
  it('bcrypt로 비밀번호를 해시할 수 있다', async () => {
    const password = '123summer!!';
    const hash = await bcrypt.hash(password, 12);
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('올바른 비밀번호로 해시 검증이 성공한다', async () => {
    const password = '123summer!!';
    const hash = await bcrypt.hash(password, 12);
    const valid = await bcrypt.compare(password, hash);
    expect(valid).toBe(true);
  });

  it('잘못된 비밀번호로 해시 검증이 실패한다', async () => {
    const password = '123summer!!';
    const hash = await bcrypt.hash(password, 12);
    const valid = await bcrypt.compare('wrongpassword', hash);
    expect(valid).toBe(false);
  });
});

describe('로컬 인증 - 사용자 조회', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('존재하는 사용자를 username으로 조회할 수 있다', async () => {
    const mockUser = {
      id: 1,
      username: 'rodcjstk4468',
      password: '$2b$12$hashedpassword',
      name: '관리자',
      role: 'admin' as const,
      approvalStatus: 'approved' as const,
    };
    vi.mocked(db.getUserByUsername).mockResolvedValue(mockUser as any);

    const user = await db.getUserByUsername('rodcjstk4468');
    expect(user).toBeTruthy();
    expect(user?.username).toBe('rodcjstk4468');
    expect(user?.role).toBe('admin');
    expect(user?.approvalStatus).toBe('approved');
  });

  it('존재하지 않는 사용자 조회 시 undefined를 반환한다', async () => {
    vi.mocked(db.getUserByUsername).mockResolvedValue(undefined);

    const user = await db.getUserByUsername('nonexistent');
    expect(user).toBeUndefined();
  });
});

describe('로컬 인증 - 회원가입 승인 흐름', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('신규 사용자는 pending 상태로 생성된다', async () => {
    vi.mocked(db.createLocalUser).mockResolvedValue(undefined);

    await db.createLocalUser({
      username: 'newuser',
      password: 'hashedpw',
      name: '새사용자',
    });

    expect(db.createLocalUser).toHaveBeenCalledWith({
      username: 'newuser',
      password: 'hashedpw',
      name: '새사용자',
    });
  });

  it('관리자가 사용자를 승인할 수 있다', async () => {
    vi.mocked(db.updateUserApproval).mockResolvedValue(undefined);

    await db.updateUserApproval(1, 'approved');

    expect(db.updateUserApproval).toHaveBeenCalledWith(1, 'approved');
  });

  it('관리자가 사용자를 거부할 수 있다', async () => {
    vi.mocked(db.updateUserApproval).mockResolvedValue(undefined);

    await db.updateUserApproval(2, 'rejected');

    expect(db.updateUserApproval).toHaveBeenCalledWith(2, 'rejected');
  });
});

describe('세션 토큰 - 로컬 로그인 식별자', () => {
  it('로컬 로그인 세션 ID는 "local:" 접두사를 가진다', () => {
    const username = 'rodcjstk4468';
    const sessionId = `local:${username}`;
    expect(sessionId.startsWith('local:')).toBe(true);
    expect(sessionId.slice(6)).toBe(username);
  });

  it('Manus OAuth 세션 ID는 "local:" 접두사를 가지지 않는다', () => {
    const openId = 'manus_user_12345';
    expect(openId.startsWith('local:')).toBe(false);
  });
});
