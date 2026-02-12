/**
 * Storage abstraction: uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
 * otherwise falls back to local filesystem (public/uploads/).
 */
import path from "path";

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

/** Upload a file and return its public URL. */
export async function storageUpload(
  filename: string,
  file: File,
): Promise<{ url: string }> {
  if (useBlob) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${filename}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return { url: blob.url };
  }

  const { writeFile, mkdir } = await import("fs/promises");
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);
  return { url: `/uploads/${filename}` };
}

/** Delete one or more files by URL. Best-effort — errors are silently ignored. */
export async function storageDelete(urls: string | string[]): Promise<void> {
  const urlArray = Array.isArray(urls) ? urls : [urls];

  if (useBlob) {
    const { del } = await import("@vercel/blob");
    await del(urlArray);
    return;
  }

  const { unlink } = await import("fs/promises");
  await Promise.all(
    urlArray.map((u) =>
      unlink(path.join(process.cwd(), "public", u)).catch(() => {})
    ),
  );
}
