import { createServer } from "node:http";
import html, {
  handleError,
  handleRedirect,
  parseBody,
  requireBasicAuth,
} from "./utils.ts";
import { ApiClient } from "./apiClient.ts";
import type { Service, TimeEntry } from "../mite.js";

const { MITE_API_KEY, MITE_ACCOUNT_NAME } = process.env;

if (!MITE_API_KEY) {
  throw new Error("process.env.MITE_API_KEY missing");
}

if (!MITE_ACCOUNT_NAME) {
  throw new Error("process.env.MITE_ACCOUNT_NAME missing");
}

const apiClient = new ApiClient({
  apiKey: MITE_API_KEY,
  accountName: MITE_ACCOUNT_NAME,
});

const renderEntry = ({
  services,
  entry,
}: {
  services: Service[];
  entry?: TimeEntry;
}) => {
  return html` <form
      action="/${entry ? "edit" : "add"}"
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
      ? html`<form action="/toggle" method="POST" class="toggle-form">
          <input type="hidden" name="timeEntry" value="${entry.id}" />
          <button type="submit" aria-pressed="${!!entry.tracking}">
            ${!!entry.tracking ? "⏸️" : "▶️"}
          </button>
        </form>`
      : ""}`;
};

createServer(async (req, res) => {
  requireBasicAuth(req, res, async () => {
    switch (req.url) {
      case "/add": {
        if (req.method !== "POST") {
          return handleError(res, new Error("Method Not Allowed"));
        }

        const params = await parseBody(req);
        const service = params.get("service");

        if (!service) {
          return handleError(res, new Error("Missing service"));
        }

        const services = await apiClient.getServices();
        const matchedService = services.find(
          ({ service: item }) => item.id === Number(service)
        );

        if (!matchedService) {
          return handleError(res, new Error("Service not found"));
        }

        const minutes = params.get("minutes");
        const note = params.get("note");

        await apiClient.addTimeEntry({
          serviceId: matchedService.service.id,
          minutes: minutes ? Number(minutes) : 0,
          note,
        });

        return handleRedirect(res, "/");
      }

      case "/edit": {
        if (req.method !== "POST") {
          return handleError(res, new Error("Method Not Allowed"));
        }

        const params = await parseBody(req);
        const timeEntryId = params.get("timeEntry");

        if (!timeEntryId) {
          return handleError(res, new Error("Missing time entry"));
        }

        const note = params.get("note");

        try {
          await apiClient.editTimeEntry({
            timeEntryId: Number(timeEntryId),
            note,
          });
        } catch (error: any) {
          return handleError(res, error);
        }

        return handleRedirect(res, "/");
      }

      case "/toggle": {
        if (req.method !== "POST") {
          return handleError(res, new Error("Method Not Allowed"));
        }

        const params = await parseBody(req);
        const timeEntryId = params.get("timeEntry");

        if (!timeEntryId) {
          return handleError(res, new Error("Missing time entry"));
        }

        await apiClient.toggleTimeEntry({ timeEntryId: Number(timeEntryId) });

        return handleRedirect(res, "/");
      }
    }

    const [services, timeEntriesToday] = await Promise.all([
      apiClient.getServices(),
      apiClient.getTimeEntriesToday(),
    ]);

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      html`<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>Mite Client</title>
            <style>
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
            </style>
          </head>
          <body>
            ${renderEntry({ services: services.map(({ service }) => service) })}

            <ul role="list" class="entries">
              ${timeEntriesToday
                .map(
                  ({ time_entry }) =>
                    html`<li class="entry grid">
                      ${renderEntry({
                        services: services.map(({ service }) => service),
                        entry: time_entry,
                      })}
                    </li>`
                )
                .join("")}
            </ul>
          </body>
        </html>`
    );
  });
}).listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
