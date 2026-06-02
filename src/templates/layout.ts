import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Routes } from "../../types.js";
import html, {
  getNextDay,
  getPreviousDay,
  getInternalUrl,
  getRelativeUrl,
  getDate,
} from "../utils.ts";
import type { ApiClient } from "../mite/apiClient.ts";

const styles = html`<style>
  :root {
    --page-padding: 0.5rem;

    --color-bg: light-dark(rgb(255 255 255), rgb(17 17 17));
    --color-bg-mute: light-dark(rgb(238 238 238), rgb(34 34 34));
    --color-border: light-dark(rgb(204 204 204), rgb(68 68 68));
    --color-text: light-dark(rgb(34 34 34), rgb(238 238 238));
    --color-text-mute: light-dark(rgb(102 102 102), rgb(153 153 153));
    --color-text-mute-active: light-dark(rgb(240 150 0), rgb(200 110 0));
    --color-submit: light-dark(rgb(230 250 230), rgb(40 60 40));
    --color-active: light-dark(rgb(230 230 250), rgb(40 40 60));
    --color-delete: light-dark(rgb(250 230 230), rgb(60 40 40));

    color-scheme: light dark;

    @media (min-width: 40rem) {
      --page-padding: 1rem;
    }
  }

  .visually-hidden {
    position: absolute;

    &:not(:focus) {
      transform: scale(0);
    }
  }

  input,
  textarea,
  button {
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    background: transparent;
    border-radius: 4px;
    font: inherit;
    width: 100%;
    box-sizing: border-box;
    color: inherit;
  }

  button {
    padding-block: 0;
    cursor: pointer;

    &[type="submit"] {
      background: var(--color-submit);
    }
  }

  .link {
    text-decoration: none;
  }

  [role="list"] {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: sans-serif;
    padding: var(--page-padding);
    margin: 0;
    background: var(--color-bg);
    color: var(--color-text);
  }

  header {
    display: flex;
    align-items: end;
    gap: 0.5rem;
    margin-block-end: calc(2 * var(--page-padding));

    h1 {
      flex: 1;
      margin-block: 0;
      font-size: 1.25rem;

      span {
        font-weight: normal;
      }
    }

    .form--invoice {
      display: flex;
      align-items: flex-end;
      gap: 0.25rem;
    }

    .action--invoice {
      background: transparent;
      appearance: none;
      border: 0;
      padding: 0;
      width: auto;
    }

    .revenue {
      color: var(--color-text-mute);
      font-size: 0.7rem;
      margin: 0;
      line-height: 1;
      text-align: right;

      dd {
        margin: 0;
      }
    }
    .revenue--incomplete {
      color: var(--color-text-mute-active);
    }
  }
</style>`;

export const Icon = ({ icon, label }: { icon: string; label: string }) => {
  const id = randomUUID();

  return html`<span role="img" aria-labelledby="${id}">${icon}</span>
    <span id="${id}" class="visually-hidden">${label}</span>`;
};

export const Layout = async ({
  req,
  routes,
  apiClient,
  title,
  content,
  customStyles = "",
  customScripts = "",
}: {
  req: IncomingMessage;
  routes: Routes;
  apiClient: ApiClient;
  title: string;
  content: string;
  customStyles?: string;
  customScripts?: string;
}) => {
  const revenue = await apiClient.getRevenue();
  const runningTrackerDisclaimer = revenue.isTracking
    ? "(not including running tracker)"
    : "";

  const date = getDate(req);
  const url = getInternalUrl(req);

  const rootUrl = new URL(url.origin);
  rootUrl.pathname = routes.root.path;

  const prevUrl = new URL(rootUrl);
  prevUrl.searchParams.set("date", getPreviousDay(date));

  const nextUrl = new URL(rootUrl);
  nextUrl.searchParams.set("date", getNextDay(date));

  return html`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title} – Mite Client</title>
        ${styles} ${customStyles} ${customScripts}
      </head>
      <body>
        <header>
          <a href="${getRelativeUrl(prevUrl)}" class="link link--prev"
            >${Icon({ icon: "⬅️", label: "Previous day" })}</a
          >
          <h1>
            ${title}
            <span>(<mite-total date="${date || "today"}"></mite-total>)</span>
          </h1>
          <form
            action="${routes.invoice.path}"
            method="POST"
            class="form form--invoice"
          >
            <dl
              class="revenue${revenue.isTracking ? " revenue--incomplete" : ""}"
              title="${runningTrackerDisclaimer}"
            >
              <dt class="visually-hidden">
                Weekly revenue ${runningTrackerDisclaimer}
              </dt>
              <dd>${revenue.weekly}</dd>
              <dt class="visually-hidden">
                Monthly revenue ${runningTrackerDisclaimer}
              </dt>
              <dd>${revenue.monthly}</dd>
            </dl>
            <button type="submit" class="action action--invoice">
              ${Icon({ icon: "💰", label: "Invoice" })}
            </button>
          </form>
          <a href="${getRelativeUrl(rootUrl)}" class="link link--home"
            >${Icon({ icon: "🏠", label: "Home" })}</a
          >
          <a href="${getRelativeUrl(nextUrl)}" class="link link--next"
            >${Icon({ icon: "➡️", label: "Next day" })}</a
          >
        </header>

        <main>${content}</main>
      </body>
    </html>`;
};
