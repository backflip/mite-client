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
  .visually-hidden {
    position: absolute;

    &:not(:focus) {
      clip: rect(0 0 0 0);
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

  [role="list"] {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: sans-serif;
    margin: 0.5rem;
  }

  .grid {
    display: grid;
    grid-template-columns: auto 7rem 3rem;
    gap: 0.5rem;

    .grid {
      display: contents;
    }
  }

  .entry-form {
    position: relative;
    margin-block-end: 2rem;

    .field--minutes {
      grid-column: 2 / -1;
    }

    .field--note {
      grid-column: 1 / -1;
    }

    button[type="submit"] {
      inset: 0;
      inset-inline-start: auto;
      width: auto;
    }
  }

  .entries {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .entry {
    position: relative;

    .entry-form {
      display: contents;
    }

    .field--minutes {
      grid-column: 2;
    }

    .toggle-form {
      grid-row: 1;
      grid-column: 3;
      display: flex;

      button[type="submit"] {
        padding-block: 0;
      }
    }
  }
</style>`;

const renderEntry = ({
  routes,
  services,
  entry,
}: {
  routes: Routes;
  services: Service[];
  entry?: TimeEntry;
}) => {
  return html` <form
      action="${entry ? routes.edit?.path : routes.add?.path}"
      method="POST"
      class="entry-form"
    >
      ${entry
        ? html`<input type="hidden" name="timeEntry" value="${entry.id}" />`
        : ""}
      <div class="grid">
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
            value="${entry?.minutes ?? ""}"
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
      </div>

      <button type="submit" class="visually-hidden">
        ${entry ? "Save" : "Add"}
      </button>
    </form>
    ${entry
      ? html`<form
          action="${routes.toggle?.path}"
          method="POST"
          class="toggle-form"
        >
          <input type="hidden" name="timeEntry" value="${entry.id}" />
          <button type="submit" aria-pressed="${!!entry.tracking}">
            ${!!entry.tracking ? "⏸️" : "▶️"}
          </button>
        </form>`
      : ""}`;
};

export const renderPage = ({
  title,
  routes,
  services,
  timeEntriesToday,
}: {
  title: string;
  routes: Routes;
  services: Service[];
  timeEntriesToday: TimeEntry[];
}) => {
  return html`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        ${styles}
      </head>
      <body>
        ${renderEntry({ services, routes })}

        <ul role="list" class="entries">
          ${timeEntriesToday
            .map(
              (entry) =>
                html`<li class="entry grid">
                  ${renderEntry({
                    routes,
                    services,
                    entry,
                  })}
                </li>`
            )
            .join("")}
        </ul>
      </body>
    </html>`;
};
