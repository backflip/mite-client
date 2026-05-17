import { createServer } from "node:http";
import html, {
  handleError,
  handleRedirect,
  parseBody,
  requireBasicAuth,
} from "./utils.ts";
import { ApiClient } from "./apiClient.ts";

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
              .visually-hidden:not(:focus) {
                position: absolute;
                clip: rect(0 0 0 0);
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

              body {
                font-family: sans-serif;
                margin: 0.5rem;
              }

              .add {
                display: grid;
                grid-template-columns: auto 5rem;
                gap: 0.5rem;
                margin-block-end: 2rem;

                .field--note {
                  grid-column: 1 / -1;
                }
              }

              .fields {
                display: grid;
                grid-template-columns: auto max-content;
                gap: 0.5rem;
              }

              .field--minutes {
                width: 7rem;
              }

              dl {
                display: grid;
                grid-template-columns: max-content 1fr;
                gap: 0.5rem;
                align-items: center;
              }

              .edit {
                display: grid;
                grid-template-columns: auto max-content max-content;
                gap: 0.5rem;
              }

              .time-entry {
                display: grid;
                grid-template-columns: auto 5rem;
                align-items: center;
                /* gap: 0.5rem; */
              }
            </style>
          </head>
          <body>
            <form action="/add" method="POST" class="add">
              <div class="fields">
                <div class="field field--service">
                  <label for="service" class="visually-hidden">Service</label>
                  <input
                    type="text"
                    name="service"
                    id="service"
                    required
                    list="services"
                    placeholder="Service"
                  />
                  <datalist id="services">
                    ${services
                      .map(
                        ({ service }) =>
                          html`<option value="${service.id}">
                            ${service.name}
                          </option>`
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
                  />
                </div>
                <div class="field field--note">
                  <label for="note" class="visually-hidden">Note</label>
                  <input type="text" name="note" id="note" placeholder="Note" />
                </div>
              </div>

              <button type="submit" class="visually-hidden2">Add</button>
            </form>

            <dl>
              ${timeEntriesToday
                .map(
                  ({ time_entry }) =>
                    html`<dt>${time_entry.service_name}</dt>
                      <dd>
                        <div class="time-entry">
                          <form action="/edit" method="POST" class="edit">
                            <input
                              type="hidden"
                              name="timeEntry"
                              value="${time_entry.id}"
                            />
                            <div class="fields">
                              <div class="field field--note">
                                <label
                                  for="timeEntry-${time_entry.id}-note"
                                  class="visually-hidden"
                                  >Note</label
                                >
                                <input
                                  id="timeEntry-${time_entry.id}-note"
                                  type="text"
                                  name="note"
                                  value="${time_entry.note}"
                                  placeholder="Note"
                                />
                              </div>
                              <div class="field field--minutes">
                                <label
                                  for="timeEntry-${time_entry.id}-minutes"
                                  class="visually-hidden"
                                  >Minutes</label
                                >
                                <input
                                  id="timeEntry-${time_entry.id}-minutes"
                                  type="number"
                                  name="minutes"
                                  value="${time_entry.minutes}"
                                  placeholder="Minutes"
                                />
                              </div>
                            </div>
                            <button type="submit" class="visually-hidden2">
                              Save
                            </button>
                          </form>
                          <form action="/toggle" method="POST" class="toggle">
                            <input
                              type="hidden"
                              name="timeEntry"
                              value="${time_entry.id}"
                            />
                            <button
                              type="submit"
                              aria-pressed="${!!time_entry.tracking}"
                            >
                              ${!!time_entry.tracking ? "⏸️" : "▶️"}
                            </button>
                          </form>
                        </div>
                      </dd>`
                )
                .join("")}
            </dl>
          </body>
        </html>`
    );
  });
}).listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
