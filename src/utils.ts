import type { IncomingMessage, ServerResponse } from "node:http";

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
