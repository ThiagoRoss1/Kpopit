/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";

// Build time: one prerendered page per Markdown post (the file name is the slug).
export function blogPaths(): string[] {
  const dir = path.join(process.cwd(), "content/blog");
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => `/blog/${f.replace(/\.md$/, "")}`);
}
