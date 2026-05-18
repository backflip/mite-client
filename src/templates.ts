import { randomUUID } from "node:crypto";
import type { Service, TimeEntry } from "../mite.js";
import type { Routes } from "../types.js";

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

    &[type="submit"] {
      background: rgba(0, 200, 0, 0.1);
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
    background: rgba(0, 0, 0, 0.1);
    margin: calc(-1 * var(--page-padding));
    margin-block-end: 1rem;
    padding: var(--page-padding);
  }

  .entry-form {
    .field--minutes {
      grid-column: 2 / 4;
    }

    .field--note {
      grid-column: 1 / 3;
    }
  }

  .entries {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    form {
      display: contents;
    }

    .action--toggle {
      background: transparent;
      grid-row: 1;
      grid-column: 4;
    }
    .action--delete {
      background: rgba(200, 0, 0, 0.1);
    }

    .entry:has(.action--toggle[aria-pressed="true"]) {
      .field--minutes input,
      .action--toggle {
        background: rgba(0, 0, 200, 0.1);
      }
    }
  }
</style>`;

const Icon = ({ icon, label }: { icon: string; label: string }) => {
  const id = randomUUID();

  return html`<span role="img" aria-labelledby="${id}">${icon}</span>
    <span id="${id}" class="visually-hidden">${label}</span>`;
};

const Entry = ({
  routes,
  services,
  entry,
  date,
}: {
  routes: Routes;
  services: Service[];
  date: string;
  entry?: TimeEntry;
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
      <div class="field field--minutes">
        <label for="minutes" class="visually-hidden">Minutes</label>
        <input
          type="number"
          name="minutes"
          id="minutes"
          placeholder="Minutes"
          value="${entry?.tracking?.minutes || entry?.minutes || ""}"
        />
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

      <button type="submit">
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
}: {
  title: string;
  routes: Routes;
  services: Service[];
  timeEntries: TimeEntry[];
  date: string;
  prevUrl: string;
  nextUrl: string;
}) => {
  const total = timeEntries.reduce(
    (sum, entry) => sum + (entry.tracking?.minutes || entry.minutes || 0),
    0
  );

  return html`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        ${styles}
      </head>
      <body>
        <header>
          <a href="${prevUrl}"
            >${Icon({ icon: "⬅️", label: "Previous day" })}</a
          >
          <h1>${date}${total ? html` <span>(${total} min)</span>` : ""}</h1>
          <a href="/">${Icon({ icon: "🏠", label: "Home" })}</a>
          <a href="${nextUrl}">${Icon({ icon: "➡️", label: "Next day" })}</a>
        </header>

        <div class="add">${Entry({ services, routes, date })}</div>

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
