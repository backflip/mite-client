import { randomUUID } from "node:crypto";
import type { Service, TimeEntry } from "../mite.js";
import type { Routes } from "../types.js";
import { formatMinutes } from "./utils.ts";

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
    cursor: pointer;

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

    .action--invoice {
      background: transparent;
      appearance: none;
      border: 0;
      padding: 0;
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

const scripts = html`<script>
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
        ${styles} ${scripts}
      </head>
      <body>
        <header>
          <a href="${prevUrl}" class="link link--prev"
            >${Icon({ icon: "⬅️", label: "Previous day" })}</a
          >
          <h1>
            ${date}${total ? html` <span>(${formatMinutes(total)})</span>` : ""}
          </h1>
          <form
            action="${routes.invoice.path}"
            method="POST"
            class="link link--invoice"
          >
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
          ${Entry({ services, routes, date, autoFocus: true })}
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

export const InvoicePage = ({
  services,
  customer,
  month,
  number,
}: {
  services: Array<{ service: string; minutes: number; rate: number }>;
  customer: { name: string; address: string[] };
  month: string;
  number: string;
}) => {
  const VAT = 8.1;

  const total = services.reduce(
    (sum, { minutes, rate }) => sum + rate * (minutes / 60),
    0
  );
  const vat = total * (VAT / 100);
  const dateFormatted = new Date().toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const dueDateFormatted = dueDate.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return html`<!DOCTYPE html>
    <html lang="de">
      <head>
        <meta charset="UTF-8" />
        <title>Rechnung</title>
        <style>
          :root {
            --accent-color: #999;
            --line-color: #ddd;
          }

          body {
            margin: 2rem;
            font-family: sans-serif;
            font-size: 87.5%;
          }

          h1 {
            font-size: 2rem;
            margin: 0;
          }

          dl {
            display: grid;
            grid-template-columns: max-content auto;
            gap: 0 0.5rem;
            margin: 0;
          }

          dt {
            color: var(--accent-color);
          }

          dd {
            border-left: 1px solid var(--line-color);
            padding-inline-start: 0.5rem;
            margin: 0;
            padding-block-end: 0.25rem;
          }

          table {
            width: 100%;

            th,
            td {
              text-align: right;
              padding: 0.5rem 0 0.5rem 0.5rem;

              &:first-child {
                text-align: left;
                padding-inline-start: 0;
                width: 50%;
              }
            }

            thead {
              th {
                color: var(--accent-color);
                font-weight: normal;
              }
            }

            tbody {
              td {
                border-top: 1px solid var(--line-color);
              }

              tr:last-child {
                td {
                  border-bottom: 1px solid var(--line-color);
                }
              }
            }

            tfoot {
              th,
              td {
                padding-block-end: 0;

                &:first-child {
                  text-align: right;
                  font-weight: normal;
                  color: var(--accent-color);
                }
              }

              tr:first-child {
                th,
                td {
                  padding-block-start: 1rem;
                }
              }

              tr:last-child {
                th,
                td {
                  padding-block-start: 1rem;
                  font-size: 1.125rem;
                  font-weight: bold;
                  color: inherit;
                }
              }
            }
          }

          header {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 2rem;
            margin-bottom: 2rem;

            .addresses {
              grid-row: 1 / 3;
              grid-column: 2;

              dd {
                margin-block-end: 2rem;
                margin-inline-end: 4rem;

                strong {
                  display: inline-block;
                  margin-block-end: 0.25rem;
                }
              }
            }
          }

          footer {
            margin-block-start: 4rem;
            padding-block-start: 2rem;
            border-top: 1px solid var(--line-color);
          }
        </style>
      </head>
      <body>
        <header>
          <h1>Rechnung</h1>

          <dl class="addresses">
            <dt>Von</dt>
            <dd>
              <strong>responsive.ch GmbH</strong><br />
              Thomas Jaggi<br />
              Hardungstrasse 55<br />
              9011 St. Gallen
            </dd>
            <dt>An</dt>
            <dd>
              ${customer.address
                .map(
                  (line, index) =>
                    `${index === 0 ? html`<strong>${line}</strong>` : line}`
                )
                .join(html`<br />`)}
            </dd>
          </dl>

          <dl class="details">
            <dt>Rechnungsnummer</dt>
            <dd>${number}</dd>
            <dt>Rechnungsdatum</dt>
            <dd>${dateFormatted}</dd>
            <dt>Zahlungsfrist</dt>
            <dd>${dueDateFormatted}</dd>
            <dt>Betreff</dt>
            <dd>Rechnung ${customer.name} ${month}</dd>
          </dl>
        </header>

        <table>
          <thead>
            <tr>
              <th>Beschreibung</th>
              <th>Stunden</th>
              <th>Ansatz</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${services
              .map(
                ({ service, minutes, rate }) =>
                  html`<tr>
                    <td>${service}</td>
                    <td>${(minutes / 60).toFixed(2)}</td>
                    <td>CHF ${rate.toFixed(2)}</td>
                    <td>CHF ${(rate * (minutes / 60)).toFixed(2)}</td>
                  </tr>`
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3">Subtotal</th>
              <td>CHF ${total.toFixed(2)}</td>
            </tr>
            <tr>
              <th colspan="3">MWST (${VAT}%)</th>
              <td>CHF ${vat.toFixed(2)}</td>
            </tr>
            <tr>
              <th colspan="3">Gesamttotal</th>
              <td>CHF ${(total + vat).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <footer>
          <dl>
            <dt>Konto</dt>
            <dd>
              Raiffeisenbank Gossau-Niederwil<br />
              IBAN: CH24 8080 8005 4099 1306 3
            </dd>
            <dt>UID</dt>
            <dd>CHE-430.379.404</dd>
          </dl>
        </footer>
      </body>
    </html>`;
};
