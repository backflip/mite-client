import type { IncomingMessage, ServerResponse } from "node:http";

const { PORT } = process.env;

export const port = PORT ? Number(PORT) : 3000;

/**
 * Allow for syntax highlighting in template strings
 * E.g. via https://marketplace.visualstudio.com/items?itemName=bierner.lit-html
 * Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#raw_strings
 */
export default function html(
  strings: string[] | ArrayLike<string>,
  ...values: any[]
) {
  return String.raw({ raw: strings }, ...values);
}

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

  let authHeader = req.headers.authorization?.split(/\s+/)[1];

  const url = getInternalUrl(req);

  // Allow passing auth via query parameter at event stream endpoint
  // Safari does not seem to send header in event source requests
  if (!authHeader && url.pathname === "/tracking") {
    authHeader = url.searchParams.get("authorization") ?? "";
  }

  const [login, password] = Buffer.from(authHeader || "", "base64")
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
  const nextDate = date && date !== "today" ? new Date(date) : new Date();

  nextDate.setDate(nextDate.getDate() + 1);

  return String(nextDate.toISOString().split("T")[0]);
};

export const getPreviousDay = (date?: string) => {
  const prevDate = date && date !== "today" ? new Date(date) : new Date();

  prevDate.setDate(prevDate.getDate() - 1);

  return String(prevDate.toISOString().split("T")[0]);
};

export const formatMinutes = (minutes: number) => {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
};

export const parseMinutes = (minutes: string) => {
  const parts = minutes.split(":").map(Number);
  const mins = parts.pop() ?? 0;
  const hours = parts.pop() ?? 0;

  return hours * 60 + mins;
};

export const getInternalUrl = (req: IncomingMessage) => {
  const url = new URL(req.url || "", `http://localhost:${port}`);

  return url;
};

export const getRelativeUrl = (url: URL) => {
  return url.toString().replace(url.origin, "");
};

export const getDate = (req: IncomingMessage) => {
  const url = getInternalUrl(req);
  const date = url.searchParams.get("date") ?? "today";

  return date;
};

export const getMonthName = (monthIndex: number) => {
  return new Date(0, monthIndex).toLocaleString("de-CH", { month: "long" });
};

export const replacePlaceholders = (
  template: string,
  placeholders: Record<string, string>
) => {
  let result = template;

  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }

  return result;
};
export const formatAmount = (amount: number) => amount.toFixed(2);

export const formatTotal = (amount: number) => `${amount.toFixed(1)}0`;
