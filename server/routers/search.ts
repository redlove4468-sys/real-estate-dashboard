import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { kwonri, client } from "../../drizzle/schema";
import { or, like } from "drizzle-orm";
import { z } from "zod";

export const searchRouter = router({
  // 전화번호 통합 검색 (물건 + 고객)
  phone: protectedProcedure
    .input(z.object({ query: z.string().min(4) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { kwonri: [], customers: [] };

      const q = `%${input.query}%`;

      const [kwonriResults, clientResults] = await Promise.all([
        db.select({
          id: kwonri.id,
          name: kwonri.name,
          address: kwonri.address,
          phone1: kwonri.phone1,
          phone2: kwonri.phone2,
          homePhone: kwonri.homePhone,
          mobile: kwonri.mobile,
          ownerName: kwonri.ownerName,
          manager: kwonri.manager,
          industry: kwonri.industry,
        })
          .from(kwonri)
          .where(or(
            like(kwonri.phone1, q),
            like(kwonri.phone2, q),
            like(kwonri.homePhone, q),
            like(kwonri.mobile, q),
          ))
          .limit(20),

        db.select({
          id: client.id,
          name: client.name,
          mobile: client.mobile,
          homePhone: client.homePhone,
          companyPhone: client.companyPhone,
          otherPhone: client.otherPhone,
          manager: client.manager,
          wantIndustry: client.wantIndustry,
        })
          .from(client)
          .where(or(
            like(client.mobile, q),
            like(client.homePhone, q),
            like(client.companyPhone, q),
            like(client.otherPhone, q),
          ))
          .limit(20),
      ]);

      return { kwonri: kwonriResults, customers: clientResults };
    }),
});
