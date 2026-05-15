import fs from "fs";
import os from "os";
import path from "path";

export function getUploadDirectory(...segments) {
  const baseDir =
    process.env.VERCEL === "1"
      ? path.join(os.tmpdir(), "campus-reports", "uploads")
      : path.join(process.cwd(), "backend", "uploads");

  const uploadDirectory = path.join(baseDir, ...segments);
  fs.mkdirSync(uploadDirectory, { recursive: true });
  return uploadDirectory;
}
