import type { IncomingMessage, ServerResponse } from "node:http";
import puppeteer from "puppeteer";
import { BlobReader, BlobWriter, ZipWriter } from "@zip.js/zip.js";

export const parseBody = async (req: IncomingMessage) => {
  let body = "";

  for await (const chunk of req) {
    body += chunk;
  }

  return new URLSearchParams(body);
};

export const handleError = (res: ServerResponse, error: Error) => {
  console.error(error);

  res.writeHead(500, { "Content-Type": "text/plain" });
  res.end(error.message);
};

export const handleRootRedirect = (res: ServerResponse, date?: string) => {
  let location = "/";

  if (date && date !== "today") {
    location += `?date=${date}`;
  }

  res.writeHead(302, { location });
  res.end();
};

export const requireBasicAuth = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) => {
  const { BASIC_AUTH } = process.env;

  if (!BASIC_AUTH) {
    throw new Error("process.env.BASIC_AUTH missing");
  }

  const authHeader = req.headers.authorization?.split(/\s+/)[1] || "";
  const [login, password] = Buffer.from(authHeader, "base64")
    .toString()
    .split(/\:(.*)/);
  const [expectedLogin, expectedPassword] = BASIC_AUTH.split(/\:(.*)/);

  if (login !== expectedLogin || password !== expectedPassword) {
    res.writeHead(401, {
      "WWW-Authenticate": 'Basic realm="Mite Client"',
    });
    res.end("Unauthorized");

    return;
  }

  next();
};

export const getNextDay = (date?: string) => {
  const nextDate = date ? new Date(date) : new Date();

  nextDate.setDate(nextDate.getDate() + 1);

  return String(nextDate.toISOString().split("T")[0]);
};

export const getPreviousDay = (date?: string) => {
  const prevDate = date ? new Date(date) : new Date();

  prevDate.setDate(prevDate.getDate() - 1);

  return String(prevDate.toISOString().split("T")[0]);
};

export const formatMinutes = (minutes: number) => {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
};

export const createPdf = async (html: string) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(`data:text/html,${html}`, {
    waitUntil: "networkidle2",
  });

  const pdf = await page.pdf();

  await browser.close();

  return Buffer.from(pdf);
};

export const createZip = async (
  files: Array<{ name: string; content: Buffer }>
) => {
  const zipWriter = new ZipWriter(new BlobWriter("application/zip"));

  await Promise.all(
    files.map(({ name, content }) =>
      zipWriter.add(name, new BlobReader(new Blob([content])))
    )
  );

  return zipWriter.close();
};

export const formatFileNamePart = (part?: string) => {
  return part?.replace(/[^a-z0-9]/gi, "") ?? "";
};

export const getMonthName = (monthIndex: number) => {
  return new Date(0, monthIndex).toLocaleString("de-CH", { month: "long" });
};
