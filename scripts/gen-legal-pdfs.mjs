// Renders the legal PDFs served from /legal/*.pdf (linked from the summary
// page's consent line) out of the markdown source of truth in docs/legal/.
//
// Update flow: edit docs/legal/<doc>.md, then `npm run gen-legal`. The PDFs
// are committed artifacts — regenerate and commit both together.
//
// The parser is deliberately small: it understands just the markdown these
// documents use — `#`/`##` headings, `*italic*` lines, `- ` bullet lists,
// `**bold**` inline spans, and blank-line-separated paragraphs.

import React from "react";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Document, Page, View, Text, renderToFile, StyleSheet } from "@react-pdf/renderer";

const h = React.createElement;
const GREEN = "#003B2B";
const MUTED = "#4A5C56";

const styles = StyleSheet.create({
  page: { paddingVertical: 56, paddingHorizontal: 56, color: GREEN, fontSize: 10.5, lineHeight: 1.6, fontFamily: "Helvetica" },
  eyebrow: { fontSize: 9, letterSpacing: 1.4, color: MUTED, marginBottom: 14 },
  h1: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  date: { fontSize: 9.5, color: MUTED, marginBottom: 18, fontFamily: "Helvetica-Oblique" },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 4 },
  p: { marginBottom: 8, color: MUTED },
  li: { flexDirection: "row", marginBottom: 4, color: MUTED, paddingLeft: 8 },
  liBullet: { width: 12 },
  liText: { flex: 1 },
  footer: { marginTop: 26, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: "#C8D0C9", fontSize: 9, color: MUTED },
});

// Split a line into Text runs, turning **…** spans bold.
function inline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((s) => s !== "");
  return parts.map((part, i) => {
    const bold = part.startsWith("**") && part.endsWith("**");
    return h(
      Text,
      { key: `${keyPrefix}-${i}`, style: bold ? { fontFamily: "Helvetica-Bold", color: GREEN } : undefined },
      bold ? part.slice(2, -2) : part,
    );
  });
}

// Parse the supported markdown subset into a flat list of block nodes.
function parseBlocks(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let para = [];
  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "p", text: para.join(" ") });
      para = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flushPara();
    } else if (line.startsWith("## ")) {
      flushPara();
      blocks.push({ type: "h2", text: line.slice(3) });
    } else if (line.startsWith("# ")) {
      flushPara();
      blocks.push({ type: "h1", text: line.slice(2) });
    } else if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
      flushPara();
      blocks.push({ type: "date", text: line.replace(/^\*|\*$/g, "") });
    } else if (line.startsWith("- ")) {
      flushPara();
      blocks.push({ type: "li", text: line.slice(2) });
    } else {
      para.push(line);
    }
  }
  flushPara();
  return blocks;
}

function render(blocks) {
  return blocks.map((b, i) => {
    const key = `b${i}`;
    switch (b.type) {
      case "h1":
        return h(Text, { key, style: styles.h1 }, b.text);
      case "date":
        return h(Text, { key, style: styles.date }, b.text);
      case "h2":
        return h(Text, { key, style: styles.h2 }, b.text);
      case "li":
        return h(View, { key, style: styles.li }, [
          h(Text, { key: "bul", style: styles.liBullet }, "•"),
          h(Text, { key: "txt", style: styles.liText }, inline(b.text, key)),
        ]);
      default:
        return h(Text, { key, style: styles.p }, inline(b.text, key));
    }
  });
}

async function buildDoc(srcPath) {
  const md = await readFile(srcPath, "utf8");
  const blocks = parseBlocks(md);
  const titleBlock = blocks.find((b) => b.type === "h1");
  const title = titleBlock ? titleBlock.text : "Easy Housing";
  return h(Document, { title }, h(Page, { size: "A4", style: styles.page }, [
    h(Text, { key: "eyebrow", style: styles.eyebrow }, "EASY HOUSING"),
    ...render(blocks),
    h(Text, { key: "footer", style: styles.footer }, "A home for everyone, Easy Housing"),
  ]));
}

const srcDir = path.join(process.cwd(), "docs", "legal");
const outDir = path.join(process.cwd(), "public", "legal");
await mkdir(outDir, { recursive: true });

const jobs = [
  ["terms-and-conditions.md", "terms-and-conditions.pdf"],
  ["privacy-policy.md", "privacy-policy.pdf"],
];

for (const [src, out] of jobs) {
  const doc = await buildDoc(path.join(srcDir, src));
  await renderToFile(doc, path.join(outDir, out));
}

console.log("Legal PDFs written to public/legal/ from docs/legal/.");
