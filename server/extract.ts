import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

export function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i).toLowerCase() : "";
}

export async function extractResumeText(filename: string, data: ArrayBuffer): Promise<string> {
  const ext = extensionOf(filename);
  if (ext === ".pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(data));
    const { text } = await extractText(pdf, { mergePages: true });
    return text.trim();
  }
  if (ext === ".docx") {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(data) });
    return value.trim();
  }
  if (ext === ".txt") return new TextDecoder("utf-8").decode(data).trim();
  throw new Error("Unsupported file type");
}
