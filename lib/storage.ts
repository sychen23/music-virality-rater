/**
 * Storage abstraction: uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
 * otherwise falls back to local filesystem (public/uploads/).
 */
import path from "path";

const publicDir = () => path.join(process.cwd(), "public");

/** Resolve a path under public/ and verify it stays within bounds. */
function safePublicPath(...segments: string[]): string {
  // Strip leading slashes/backslashes so path.resolve treats segments as
  // relative (otherwise '/uploads/f.mp3' is treated as an absolute root).
  const cleaned = segments.map((s) => s.replace(/^[/\\]+/, ""));
  const resolved = path.resolve(publicDir(), ...cleaned);
  if (!resolved.startsWith(publicDir() + path.sep) && resolved !== publicDir()) {
    throw new Error(`Path traversal blocked: ${segments.join("/")}`);
  }
  return resolved;
}

/** Upload a file and return its public URL. */
export async function storageUpload(
  filename: string,
  file: File,
): Promise<{ url: string }> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${filename}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return { url: blob.url };
  }

  const { writeFile, mkdir } = await import("fs/promises");
  const uploadsDir = safePublicPath("uploads");
  await mkdir(uploadsDir, { recursive: true });
  const filePath = safePublicPath("uploads", filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);
  return { url: `/uploads/${filename}` };
}

/**
 * Delete one or more files by URL.
 * Missing files are silently skipped (matches Vercel Blob `del()` semantics).
 * Real I/O errors (permissions, disk) are thrown so callers can retry.
 */
export async function storageDelete(urls: string | string[]): Promise<void> {
  const urlArray = Array.isArray(urls) ? urls : [urls];

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { del } = await import("@vercel/blob");
    await del(urlArray);
    return;
  }

  const { unlink } = await import("fs/promises");
  await Promise.all(
    urlArray.map((u) =>
      unlink(safePublicPath(u)).catch((err: NodeJS.ErrnoException) => {
        if (err.code !== "ENOENT") throw err;
      })
    ),
  );
}
