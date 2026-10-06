import "server-only";
import { DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";
import { requireR2 } from "./client";

export const UPLOAD_URL_TTL_SECONDS = 15 * 60;

/** Presigned PUT bound to an exact type and length: the browser can't upload anything else. */
export function presignUpload(key: string, contentType: string, contentLength: number): Promise<string> {
  const { client, bucket } = requireR2();
  return getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: contentLength }), {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
    signableHeaders: new Set(["content-type", "content-length"]),
  });
}

/** Size of a stored object, or null if it doesn't exist. */
export async function objectSize(key: string): Promise<number | null> {
  const { client, bucket } = requireR2();
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return head.ContentLength ?? null;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return null;
    throw error;
  }
}

export async function readObject(key: string): Promise<Buffer> {
  const { client, bucket } = requireR2();
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!object.Body) throw new Error(`Empty object body: ${key}`);
  return Buffer.from(await object.Body.transformToByteArray());
}

export async function writeObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const { client, bucket } = requireR2();
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: "private, max-age=31536000, immutable" }),
  );
}

/** Deletes up to 1000 keys per request; missing keys are ignored by S3/R2. */
export async function deleteObjects(keys: string[]): Promise<void> {
  const { client, bucket } = requireR2();
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    if (chunk.length === 0) continue;
    await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } }));
  }
}

/** Streams an object without buffering it (used when packing archives). */
export async function readObjectStream(key: string): Promise<Readable> {
  const { client, bucket } = requireR2();
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!object.Body) throw new Error(`Empty object body: ${key}`);
  return object.Body as Readable;
}

/** Multipart upload from a stream of unknown length (archives). Returns bytes written. */
export async function uploadStream(key: string, body: Readable, contentType: string): Promise<void> {
  const { client, bucket } = requireR2();
  const upload = new Upload({
    client,
    params: { Bucket: bucket, Key: key, Body: body, ContentType: contentType },
    partSize: 16 * 1024 * 1024,
    queueSize: 4,
  });
  await upload.done();
}
