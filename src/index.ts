import { createServer } from "node:http";
import {
  handleError,
  handleRedirect,
  parseBody,
  requireBasicAuth,
} from "./utils.ts";
import { ApiClient } from "./apiClient.ts";
import { renderPage } from "./templates.ts";

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

    const page = renderPage({
      title: "Mite Client",
      services: services.map(({ service }) => service),
      timeEntriesToday: timeEntriesToday.map(({ time_entry }) => time_entry),
    });

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(page);
  });
}).listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
