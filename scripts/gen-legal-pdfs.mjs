import React from "react";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Document, Page, View, Text, renderToFile, StyleSheet } from "@react-pdf/renderer";

const h = React.createElement;
const GREEN = "#003B2B";
const MUTED = "#4A5C56";

const styles = StyleSheet.create({
  page: { padding: 56, color: GREEN, fontSize: 11, lineHeight: 1.6, fontFamily: "Helvetica" },
  h1: { fontSize: 24, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  eyebrow: { fontSize: 9, letterSpacing: 1.4, color: MUTED, marginBottom: 16 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 4 },
  p: { marginBottom: 8, color: MUTED },
  footer: { marginTop: 24, fontSize: 9, color: MUTED },
});

function doc(title, sections) {
  return h(Document, { title }, h(Page, { size: "A4", style: styles.page }, [
    h(Text, { key: "e", style: styles.eyebrow }, "EASY HOUSING"),
    h(Text, { key: "h", style: styles.h1 }, title),
    h(Text, { key: "s", style: styles.p },
      "Placeholder document. Replace with the final legal text before launch."),
    ...sections.flatMap((sec, i) => [
      h(Text, { key: `h${i}`, style: styles.h2 }, sec.heading),
      h(Text, { key: `p${i}`, style: styles.p }, sec.body),
    ]),
    h(Text, { key: "f", style: styles.footer }, "A home for everyone, Easy Housing"),
  ]));
}

const terms = doc("Terms & Conditions", [
  { heading: "1. Scope", body: "These terms govern your use of the Easy Housing configurator and the design brief it generates. The indicative budget is an estimate and is not a binding quotation." },
  { heading: "2. Your design", body: "The design and pricing depend on the floor plan you select and the dimensions you choose. Final pricing depends on site conditions and local sourcing." },
  { heading: "3. Contact", body: "By submitting the form you ask us to prepare and email your design PDF and to have our sales team contact you about it." },
]);

const privacy = doc("Privacy Policy", [
  { heading: "1. What we collect", body: "Your name, email address, phone number, intended timeline, and the design you configured." },
  { heading: "2. How we use it", body: "To email you your design PDF and to have our Easy Housing sales team contact you about it. We will not share or sell your details to any third party." },
  { heading: "3. Your rights", body: "You can ask us to access, correct or delete your details at any time by contacting hello@easyhousing.org." },
]);

const outDir = path.join(process.cwd(), "public", "legal");
await mkdir(outDir, { recursive: true });
await renderToFile(terms, path.join(outDir, "terms-and-conditions.pdf"));
await renderToFile(privacy, path.join(outDir, "privacy-policy.pdf"));
console.log("Legal PDFs written to public/legal/");
