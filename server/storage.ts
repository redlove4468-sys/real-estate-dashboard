// Storage helpers backed directly by AWS S3 (or any S3-compatible bucket).
// Replaces the old Manus Forge presign proxy. Uploads go straight to S3
// via the AWS SDK; downloads return signed GET URLs directly (no redirect proxy needed).

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function getS3Config() {
  const bucket = ENV.s3Bucket;
  const region = ENV.s3Region;

  if (!bucket) {
    throw new Error("Storage config missing: set S3_BUCKET (and AWS credentials)");
  }

  return { bucket, region: region || "ap-northeast-2" };
}

let _client: S3Client | null = null;
function getClient(): S3Client {
  if (!_client) {
    const { region } = getS3Config();
    // AWS SDK automatically picks up AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
    // from environment variables — no need to pass credentials explicitly.
    _client = new S3Client({ region });
  }
  return _client;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const { bucket } = getS3Config();
  const key = appendHashSuffix(normalizeKey(relKey));
  const client = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    }),
  );

  // Stable path-style reference; actual signed read URL is generated
  // on demand by storageGetSignedUrl.
  return { key, url: `/storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { bucket } = getS3Config();
  const key = normalizeKey(relKey);
  const client = getClient();

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  // URL valid for 1 hour
  return getSignedUrl(client, command, { expiresIn: 3600 });
}
