import { z } from "zod";

const fileNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .regex(/\.pdf$/i);

const createMockPdf = (fileName: string) => {
  const safeFileName = fileName
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[()\\]/g, "\\$&");
  const stream = [
    "BT",
    "/F1 18 Tf",
    "72 760 Td",
    "(CWIE BRU - Mock document) Tj",
    "0 -28 Td",
    `(File: ${safeFileName}) Tj`,
    "ET",
  ].join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(body));
    body += object;
  });
  const xrefOffset = Buffer.byteLength(body);
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
  ].join("\n");
  return `${body}${xref}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
};

export default defineEventHandler((event) => {
  const parsed = fileNameSchema.safeParse(getRouterParam(event, "fileName"));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid PDF file name" });
  }

  const fileName = parsed.data;
  setResponseHeader(event, "Content-Type", "application/pdf");
  setResponseHeader(
    event,
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
  return createMockPdf(fileName);
});
