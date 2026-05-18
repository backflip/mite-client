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
    margin: 0.5rem;
  }

  .grid {
    display: grid;
    grid-template-columns: auto 7rem 3rem 3rem;
    gap: 0.5rem;

    .grid {
      display: contents;
    }
  }

  .entry-form {
    margin-block-end: 2rem;

    .field--minutes {
      grid-column: 2 / -1;
    }

    .field--note {
      grid-column: 1 / 4;
    }
  }

  .entries {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    .field--minutes {
      grid-column: 2 / 4;
    }
    .field--note {
      grid-column: 1 / 3;
    }

    .action--toggle {
      background: transparent;
    }
    .action--delete {
      background: rgba(200, 0, 0, 0.1);
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
}: {
  routes: Routes;
  services: Service[];
  entry?: TimeEntry;
}) => {
  return html` <form
    action="${entry ? routes.edit.path : routes.add.path}"
    method="POST"
    class="entry-form grid"
  >
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
        value="${entry?.minutes ?? ""}"
      />
    </div>
    ${entry
      ? html`<button
          type="submit"
          class="action action--toggle"
          formaction="${routes.toggle.path}"
          aria-pressed="${!!entry.tracking}"
        >
          ${!!entry.tracking
            ? Icon({ icon: "⏸️", label: "Pause" })
            : Icon({ icon: "▶️", label: "Play" })}
        </button>`
      : ""}
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

    ${entry
      ? html`<button
          type="submit"
          class="action action--delete"
          formaction="${routes.delete.path}"
        >
          ${Icon({ icon: "🗑️", label: "Delete" })}
        </button>`
      : ""}

    <button type="submit">
      ${entry
        ? Icon({ icon: "💾", label: "Save" })
        : Icon({ icon: "➕", label: "Add" })}
    </button>
  </form>`;
};

export const Page = ({
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
        ${Entry({ services, routes })}

        <ul role="list" class="entries">
          ${timeEntriesToday
            .map(
              (entry) =>
                html`<li>
                  ${Entry({
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
