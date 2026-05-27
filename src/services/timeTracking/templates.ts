import { randomUUID } from "node:crypto";
import type { Service, TimeEntry } from "../../mite/types.js";
import type { Routes } from "../../../types.js";
import html, { formatMinutes } from "../../utils.ts";

const styles = html`<style>
  :root {
    --page-padding: 0.5rem;

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
    border: 1px solid #ccc;
    border-radius: 4px;
    font: inherit;
    width: 100%;
    box-sizing: border-box;
  }

  button {
    padding-block: 0;
    cursor: pointer;

    &[type="submit"] {
      background: rgb(230, 250, 230);
    }
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
      color: #666;
      font-size: 0.7rem;
      margin: 0;
      line-height: 1;
      text-align: right;

      dd {
        margin: 0;
      }
    }
    .revenue--incomplete {
      color: orange;
    }
  }

  .grid {
    display: grid;
    grid-template-columns: auto 7rem 3rem 3rem;
    gap: 0.5rem;

    .grid {
      display: contents;
    }
  }

  .add {
    background: rgb(230, 230, 230);
    margin: calc(-1 * var(--page-padding));
    margin-block-end: 1.5rem;
    padding: var(--page-padding);
  }

  .entry-form {
    .field--service {
      grid-column: 1 / 4;
    }
    .field--note {
      grid-column: 1 / 2;
    }
    .field--minutes {
      grid-column: 2 / 4;
    }
  }

  .entries {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    form {
      display: contents;
    }

    .field--minutes {
      grid-column: 2 / 3;
    }

    .action--submit {
      grid-column: 4;
    }

    .action--toggle {
      background: transparent;
      grid-row: 2;
      grid-column: 3;
    }
    .action--delete {
      background: rgb(250, 230, 230);
      grid-row: 1;
      grid-column: 4;
    }

    .entry:has(.action--toggle[aria-pressed="true"]) {
      .field--minutes input,
      .action--toggle {
        background: rgb(230, 230, 250);
      }
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

const Icon = ({ icon, label }: { icon: string; label: string }) => {
  const id = randomUUID();

  return html`<span role="img" aria-labelledby="${id}">${icon}</span>
    <span id="${id}" class="visually-hidden">${label}</span>`;
};

const MinutesInput = ({ minutes }: { minutes: number }) => {
  return html`<input
    type="text"
    inputmode="numeric"
    pattern="(?:[0-9]*:)?(?:[0-5])?[0-9]"
    name="minutes"
    id="minutes"
    placeholder="Minutes"
    value="${formatMinutes(minutes)}"
  />`;
};

const Entry = ({
  routes,
  services,
  entry,
  date,
  autoFocus,
}: {
  routes: Routes;
  services: Service[];
  date: string;
  entry?: TimeEntry;
  autoFocus?: boolean;
}) => {
  return html`<form
      action="${entry ? routes.edit.path : routes.add.path}"
      method="POST"
      class="entry-form grid"
    >
      <input type="hidden" name="date" value="${date}" />
      ${entry
        ? html`<input type="hidden" name="timeEntry" value="${entry.id}" />`
        : ""}

      <div class="field field--service">
        <label for="service" class="visually-hidden">Service</label>
        <input
          type="text"
          name="service"
          id="service"
          required
          list="services"
          placeholder="Service"
          value="${entry?.service_name ?? ""}"
          ${autoFocus ? "autofocus" : ""}
        />
        <datalist id="services">
          ${services
            .map(
              (service) =>
                html`<option value="${service.id}">${service.name}</option>`
            )
            .join("")}
        </datalist>
      </div>
      <div class="field field--note">
        <label for="note" class="visually-hidden">Note</label>
        <input
          type="text"
          name="note"
          id="note"
          placeholder="Note"
          value="${entry?.note ?? ""}"
        />
      </div>
      <div class="field field--minutes">
        <label for="minutes" class="visually-hidden">Minutes</label>
        ${entry?.tracking
          ? html`<mite-tracking>
              ${MinutesInput({
                minutes: entry.tracking.minutes || entry?.minutes || 0,
              })}
            </mite-tracking>`
          : MinutesInput({
              minutes: entry?.tracking?.minutes || entry?.minutes || 0,
            })}
      </div>

      <button type="submit" class="action action--submit">
        ${entry
          ? Icon({ icon: "💾", label: "Save" })
          : Icon({ icon: "➕", label: "Add" })}
      </button>
    </form>
    ${entry
      ? html`<form action="${routes.toggle.path}" method="POST">
            <input type="hidden" name="date" value="${date}" />
            <input type="hidden" name="timeEntry" value="${entry.id}" />
            <button
              type="submit"
              class="action action--toggle"
              aria-pressed="${!!entry.tracking}"
            >
              ${!!entry.tracking
                ? Icon({ icon: "⏸️", label: "Pause" })
                : Icon({ icon: "▶️", label: "Play" })}
            </button>
          </form>
          <form action="${routes.delete.path}" method="POST">
            <input type="hidden" name="date" value="${date}" />
            <input type="hidden" name="timeEntry" value="${entry.id}" />
            <button type="submit" class="action action--delete">
              ${Icon({ icon: "🗑️", label: "Delete" })}
            </button>
          </form>`
      : ""}`;
};

export const Page = ({
  title,
  routes,
  services,
  timeEntries,
  date,
  prevUrl,
  nextUrl,
  revenue,
}: {
  title: string;
  routes: Routes;
  services: Service[];
  timeEntries: TimeEntry[];
  date: string;
  prevUrl: string;
  nextUrl: string;
  revenue: {
    weekly: string;
    monthly: string;
    isTracking: boolean;
  };
}) => {
  const runningTrackerDisclaimer = revenue.isTracking
    ? "(not including running tracker)"
    : "";

  return html`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        ${styles} ${scripts}
      </head>
      <body>
        <header>
          <a href="${prevUrl}" class="link link--prev"
            >${Icon({ icon: "⬅️", label: "Previous day" })}</a
          >
          <h1>
            ${date} <span>(<mite-total date="${date}"></mite-total>)</span>
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
          <a href="/" class="link link--home"
            >${Icon({ icon: "🏠", label: "Home" })}</a
          >
          <a href="${nextUrl}" class="link link--next"
            >${Icon({ icon: "➡️", label: "Next day" })}</a
          >
        </header>

        <div class="add">
          ${Entry({ services, routes, date, autoFocus: date === "today" })}
        </div>

        <ul role="list" class="entries">
          ${timeEntries
            .map(
              (entry) =>
                html`<li class="grid entry">
                  ${Entry({
                    routes,
                    services,
                    entry,
                    date,
                  })}
                </li>`
            )
            .join("")}
        </ul>
      </body>
    </html>`;
};
