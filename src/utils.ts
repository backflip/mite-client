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

export const handleRedirect = (res: ServerResponse, location: string) => {
  res.writeHead(302, { Location: location });
  res.end();
};
