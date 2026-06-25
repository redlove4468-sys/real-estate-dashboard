import type { Express } from "express";
import { storageGetSignedUrl } from "../storage";

export function registerStorageProxy(app: Express) {
  // Serves files stored via storagePut() in storage.ts.
  // Generates a short-lived signed S3 URL and redirects the browser to it.
  app.get("/storage/*", async (req: any, res) => {
    const key = req.params[0] as string | undefined;
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const url = await storageGetSignedUrl(key);
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });

  // Backward-compatible alias for any old /manus-storage/* links
  // still saved in the database from before the migration.
  app.get("/manus-storage/*", async (req: any, res) => {
    const key = req.params[0] as string | undefined;
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const url = await storageGetSignedUrl(key);
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
