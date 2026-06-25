import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { kwonriRouter } from "./routers/kwonri";
import { clientRouter as customerRouter } from "./routers/client";
import { searchRouter } from "./routers/search";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // 로컬 로그인
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserByUsername(input.username);
        if (!user || !user.password) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }

        const valid = await bcrypt.compare(input.password, user.password);
        if (!valid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }

        if (user.approvalStatus === 'pending') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '계정 승인 대기 중입니다. 관리자에게 문의하세요.' });
        }
        if (user.approvalStatus === 'rejected') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '계정이 거부되었습니다. 관리자에게 문의하세요.' });
        }

        const token = await sdk.createLocalSessionToken(user.username!, user.name || user.username!);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return { success: true, user: { id: user.id, username: user.username, name: user.name, role: user.role } };
      }),

    // 회원가입
    register: publicProcedure
      .input(z.object({
        username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/, '영문, 숫자, 언더스코어만 사용 가능합니다.'),
        password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
        name: z.string().min(1).max(50).optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getUserByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: '이미 사용 중인 아이디입니다.' });
        }

        const hashedPassword = await bcrypt.hash(input.password, 12);
        await db.createLocalUser({
          username: input.username,
          password: hashedPassword,
          name: input.name,
          email: input.email,
        });

        return { success: true, message: '회원가입이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.' };
      }),

    // 관리자: 사용자 목록 조회
    listUsers: adminProcedure
      .query(async () => {
        return db.getAllUsers();
      }),

    // 관리자: 사용자 승인/거부
    approveUser: adminProcedure
      .input(z.object({
        userId: z.number(),
        action: z.enum(['approved', 'rejected']),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserApproval(input.userId, input.action);
        return { success: true };
      }),

    // 관리자: 마스터 계정 초기 설정 (DB에 admin 없을 때만 가능)
    setupMaster: publicProcedure
      .input(z.object({
        username: z.string().min(3).max(32),
        password: z.string().min(6),
        name: z.string().optional(),
        setupKey: z.string(),  // 보안 키
      }))
      .mutation(async ({ input }) => {
        // 환경변수에서 설정 키 확인
        const expectedKey = process.env.MASTER_SETUP_KEY;
        if (!expectedKey || input.setupKey !== expectedKey) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '설정 키가 올바르지 않습니다.' });
        }

        const existing = await db.getUserByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: '이미 사용 중인 아이디입니다.' });
        }

        const hashedPassword = await bcrypt.hash(input.password, 12);
        await db.createLocalUser({
          username: input.username,
          password: hashedPassword,
          name: input.name,
        });

        // 생성된 사용자를 admin + approved로 업데이트
        const user = await db.getUserByUsername(input.username);
        if (user) {
          const dbConn = await db.getDb();
          if (dbConn) {
            const { users } = await import('../drizzle/schema');
            const { eq } = await import('drizzle-orm');
            await dbConn.update(users).set({ role: 'admin', approvalStatus: 'approved' }).where(eq(users.id, user.id));
          }
        }

        return { success: true, message: '마스터 계정이 생성되었습니다.' };
      }),
  }),
  kwonri: kwonriRouter,
  customer: customerRouter,
  search: searchRouter,
});

export type AppRouter = typeof appRouter;
