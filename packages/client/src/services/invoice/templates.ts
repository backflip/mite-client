import type { GetPage, Invoice, InvoiceEmail } from "../../../types.js";
import type { Project } from "../../mite/types.js";
import html, {
  formatAmount,
  formatTotal,
  getMonthName,
  replacePlaceholders,
} from "../../utils.ts";
import config from "../../../config.json" with { type: "json" };
import { Icon } from "../../templates/layout.ts";

const formatDate = (date: Date = new Date()) =>
  date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const pdfStyles = html`<style>
  :root {
    --accent-color: lightgray;
    --line-color: lightgray;
  }

  body {
    margin: 4rem;
    font-family: sans-serif;
    font-size: 75%;
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
</style>`;

export const Pdf = ({
  project,
  invoice,
  total,
  vat,
  services,
  customer,
  company,
  month,
}: {
  project: Project;
  invoice: Invoice;
  total: number;
  vat: number;
  services: Array<{ service: string; minutes: number; rate: number }>;
  customer: { name: string; address: string[] };
  company: {
    name: string;
    address: string[];
    bankAccount: string;
    uid: string;
  };
  month: number;
}) => {
  return html`<!DOCTYPE html>
    <html lang="de">
      <head>
        <meta charset="UTF-8" />
        <title>Rechnung</title>
        ${pdfStyles}
      </head>
      <body>
        <header>
          <h1>Rechnung</h1>

          <dl class="addresses">
            <dt>Von</dt>
            <dd>
              ${company.address
                .map(
                  (line, index) =>
                    `${index === 0 ? html`<strong>${line}</strong>` : line}`
                )
                .join(html`<br />`)}
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
            <dd>${invoice.id}</dd>
            <dt>Rechnungsdatum</dt>
            <dd>${formatDate(invoice.dateCreated)}</dd>
            <dt>Zahlungsfrist</dt>
            <dd>${formatDate(invoice.dateDue)}</dd>
            <dt>Betreff</dt>
            <dd>${project.name} ${getMonthName(month)}</dd>
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
                    <td>CHF ${formatAmount(rate)}</td>
                    <td>CHF ${formatAmount(rate * (minutes / 60))}</td>
                  </tr>`
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3">Subtotal</th>
              <td>CHF ${formatAmount(total)}</td>
            </tr>
            <tr>
              <th colspan="3">MWST (${config.vat}%)</th>
              <td>CHF ${formatAmount(vat)}</td>
            </tr>
            <tr>
              <th colspan="3">Gesamttotal</th>
              <td>CHF ${formatTotal(total + vat)}</td>
            </tr>
          </tfoot>
        </table>

        <footer>
          <dl>
            <dt>Konto</dt>
            <dd>${company.bankAccount}</dd>
            <dt>UID</dt>
            <dd>${company.uid}</dd>
          </dl>
        </footer>
      </body>
    </html>`;
};

const listingStyles = html`<style>
  .form--invoice {
    display: flex;
    margin-block-end: 2rem;

    button {
      margin-inline-start: auto;
      padding: 0.5rem 1rem;
      width: auto;
    }
  }

  .form--paid {
    display: inline-flex;

    input {
      border-bottom-right-radius: 0;
      border-top-right-radius: 0;
      border-inline-end: 0;
    }

    button {
      border-bottom-left-radius: 0;
      border-top-left-radius: 0;
    }
  }
</style>`;

export const Listing: GetPage<{
  invoices: Array<{
    project: Project;
    invoice: Invoice;
    invoiceEmail: InvoiceEmail | undefined;
  }>;
}> = async ({ req, routes, props: { invoices } }) => {
  const sortedInvoices = invoices.sort(
    (a, b) => b.invoice.dateCreated.getTime() - a.invoice.dateCreated.getTime()
  );

  const content = html`<form
      action="/invoice"
      method="POST"
      class="form form--invoice"
    >
      <button type="submit">Rechnungen erstellen</button>
    </form>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Projekt</th>
          <th>Betrag</th>
          <th>Rechnungsdatum</th>
          <th>Zahlungsfrist</th>
          <th>Zahlungseingang</th>
          <th>E-Mail</th>
        </tr>
      </thead>
      <tbody>
        ${sortedInvoices
          .map(({ invoice, project, invoiceEmail }) => {
            const monthName = getMonthName(invoice.month);
            const emailSubject = replacePlaceholders(
              config.invoiceEmail.subject,
              {
                projectName: project.name,
                monthName,
              }
            );
            const emailBody = replacePlaceholders(config.invoiceEmail.body, {
              monthName,
            });
            const emailLink = invoiceEmail
              ? `mailto:${invoiceEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
              : null;

            return html`<tr class="${invoice.datePaid ? "" : "unpaid"}">
              <td>${invoice.id}</td>
              <td>${project.customer_name} :: ${project.name}</td>
              <td>CHF ${formatTotal(invoice.amount)}</td>
              <td>${formatDate(invoice.dateCreated)}</td>
              <td>${formatDate(invoice.dateDue)}</td>
              <td>
                ${invoice.datePaid
                  ? formatDate(invoice.datePaid)
                  : html`<form
                      action="/invoice-paid"
                      method="POST"
                      class="form form--paid"
                    >
                      <input type="hidden" name="id" value="${invoice.id}" />
                      <div>
                        <label for="date" class="visually-hidden">Datum</label>
                        <input type="date" name="date" id="date" />
                      </div>
                      <button type="submit">
                        ${Icon({
                          icon: "✅",
                          label: "Bezahlt",
                        })}
                      </button>
                    </form>`}
              </td>
              <td>
                ${emailLink && !invoice.datePaid
                  ? html`<a href="${emailLink}">
                      ${Icon({
                        icon: "✉️",
                        label: "E-Mail senden",
                      })}
                    </a>`
                  : ""}
              </td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;

  return {
    content,
    customStyles: listingStyles,
  };
};
