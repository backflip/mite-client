import html from "../../utils.ts";

const formatDate = (date: Date = new Date()) =>
  date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const styles = html`<style>
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

export const Page = ({
  project,
  services,
  customer,
  company,
  month,
  number,
}: {
  project: string;
  services: Array<{ service: string; minutes: number; rate: number }>;
  customer: { name: string; address: string[] };
  company: {
    name: string;
    address: string[];
    bankAccount: string;
    uid: string;
  };
  month: string;
  number: string;
}) => {
  const VAT = 8.1;
  const DEADLINE = 30;

  const total = services.reduce(
    (sum, { minutes, rate }) => sum + rate * (minutes / 60),
    0
  );
  const vat = total * (VAT / 100);
  const dateFormatted = formatDate();

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + DEADLINE);
  const dueDateFormatted = formatDate(dueDate);

  return html`<!DOCTYPE html>
    <html lang="de">
      <head>
        <meta charset="UTF-8" />
        <title>Rechnung</title>
        ${styles}
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
            <dd>${number}</dd>
            <dt>Rechnungsdatum</dt>
            <dd>${dateFormatted}</dd>
            <dt>Zahlungsfrist</dt>
            <dd>${dueDateFormatted}</dd>
            <dt>Betreff</dt>
            <dd>${project} ${month}</dd>
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
            <dd>${company.bankAccount}</dd>
            <dt>UID</dt>
            <dd>${company.uid}</dd>
          </dl>
        </footer>
      </body>
    </html>`;
};
