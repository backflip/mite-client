import { createServer, IncomingMessage, ServerResponse } from "node:http";
import {
  handleError,
  handleRedirect,
  parseBody,
  requireBasicAuth,
} from "./utils.ts";
import { ApiClient } from "./apiClient.ts";
import { renderPage } from "./templates.ts";
import type { Routes } from "../types.js";

const { MITE_API_KEY, MITE_ACCOUNT_NAME, PORT } = process.env;

if (!MITE_API_KEY) {
  throw new Error("process.env.MITE_API_KEY missing");
}

if (!MITE_ACCOUNT_NAME) {
  throw new Error("process.env.MITE_ACCOUNT_NAME missing");
}

const port = PORT ? Number(PORT) : 3000;

const apiClient = new ApiClient({
  apiKey: MITE_API_KEY,
  accountName: MITE_ACCOUNT_NAME,
});

const routes: Routes = {
  root: {
    path: "/",
    async handler(req: IncomingMessage, res: ServerResponse) {
      const [services, timeEntriesToday] = await Promise.all([
        apiClient.getServices(),
        apiClient.getTimeEntriesToday(),
      ]);

      const page = renderPage({
        title: "Mite Client",
        routes,
        services: services.map(({ service }) => service),
        timeEntriesToday: timeEntriesToday.map(({ time_entry }) => time_entry),
      });

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(page);
    },
  },
  add: {
    path: "/add",
    async handler(req: IncomingMessage, res: ServerResponse) {
      if (req.method !== "POST") {
        throw new Error("Method Not Allowed");
      }

      const params = await parseBody(req);
      const service = params.get("service");

      if (!service) {
        throw new Error("Missing service");
      }

      const services = await apiClient.getServices();
      const matchedService = services.find(
        ({ service: item }) => item.id === Number(service)
      );

      if (!matchedService) {
        throw new Error("Service not found");
      }

      const minutes = params.get("minutes");
      const note = params.get("note");

      await apiClient.addTimeEntry({
        serviceId: matchedService.service.id,
        minutes: minutes ? Number(minutes) : 0,
        note,
      });

      return handleRedirect(res, "/");
    },
  },
  edit: {
    path: "/edit",
    async handler(req: IncomingMessage, res: ServerResponse) {
      if (req.method !== "POST") {
        throw new Error("Method Not Allowed");
      }

      const params = await parseBody(req);
      const timeEntryId = params.get("timeEntry");

      if (!timeEntryId) {
        throw new Error("Missing time entry");
      }

      const note = params.get("note");

      await apiClient.editTimeEntry({
        timeEntryId: Number(timeEntryId),
        note,
      });

      return handleRedirect(res, "/");
    },
  },
  toggle: {
    path: "/toggle",
    async handler(req: IncomingMessage, res: ServerResponse) {
      if (req.method !== "POST") {
        throw new Error("Method Not Allowed");
      }

      const params = await parseBody(req);
      const timeEntryId = params.get("timeEntry");

      if (!timeEntryId) {
        throw new Error("Missing time entry");
      }

      await apiClient.toggleTimeEntry({ timeEntryId: Number(timeEntryId) });

      return handleRedirect(res, "/");
    },
  },
};

createServer(async (req, res) => {
  requireBasicAuth(req, res, async () => {
    for (const route of Object.values(routes)) {
      if (req.url === route.path) {
        return route
          .handler(req, res)
          .catch((error) => handleError(res, error));
      }
    }

    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("Not Found");
  });
}).listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
