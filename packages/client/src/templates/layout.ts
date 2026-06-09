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

    --font-size-table: 0.8rem;

    color-scheme: light dark;

    @media (min-width: 40rem) {
      --page-padding: 1rem;
      --font-size-table: 1rem;
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

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-table);

    th,
    td {
      text-align: left;
      padding: 0.5rem 0.5rem 0.5rem 0;
    }

    tbody {
      td {
        border-top: 1px solid var(--color-border);
      }

      tr:last-child {
        td {
          border-bottom: 1px solid var(--color-border);
        }
      }
    }
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

const scripts = html`<script type="module">
  /**
   * Update total time using event stream
   */
  class MiteTotal extends HTMLElement {
    static observedAttributes = ["date"];

    evenSource;

    connectedCallback() {
      this.render();
    }

    render() {
      const date = this.attributes.date.value;

      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource("/total?date=" + date);

      this.eventSource.addEventListener(
        "message",
        (event) => (this.innerHTML = event.data)
      );
    }

    attributeChangedCallback(name, oldValue, newValue) {
      this.render();
    }
  }

  customElements.define("mite-total", MiteTotal);

  /**
   * Update tracking time using event stream
   */
  class MiteTracking extends HTMLElement {
    connectedCallback() {
      const input = this.querySelector("input");
      const eventSource = new EventSource("/tracking");

      eventSource.addEventListener(
        "message",
        (event) => (input.value = event.data)
      );
    }
  }

  customElements.define("mite-tracking", MiteTracking);

  /**
   * Keyboard navigation
   */
  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, textarea, select")) {
      return;
    }

    switch (event.key) {
      case "h":
        const homeLink = document.querySelector(".link--home");

        if (homeLink) {
          homeLink.click();
        }

        break;
      case "i":
        const invoiceButton = document.querySelector(".action--invoice");

        if (invoiceButton) {
          invoiceButton.click();
        }

        break;
      case "ArrowLeft":
        const prevLink = document.querySelector(".link--prev");

        if (prevLink) {
          prevLink.click();
        }

        break;
      case "ArrowRight":
        const nextLink = document.querySelector(".link--next");

        if (nextLink) {
          nextLink.click();
        }

        break;
    }
  });
</script>`;

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
        ${styles} ${customStyles} ${scripts} ${customScripts}
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
          <a href="${routes.invoices.path}" class="link link--invoice">
            ${Icon({ icon: "💰", label: "Invoice" })}
          </a>
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
