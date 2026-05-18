import { createServer, IncomingMessage, ServerResponse } from "node:http";
import {
  getNextDay,
  getPreviousDay,
  handleError,
  handleRootRedirect,
  parseBody,
  requireBasicAuth,
} from "./utils.ts";
import { ApiClient } from "./apiClient.ts";
import { Page } from "./templates.ts";
import type { Routes } from "../types.js";
import type { TimeEntry } from "../mite.js";

const { MITE_API_KEY, MITE_ACCOUNT_NAME, PORT } = process.env;

if (!MITE_API_KEY) {
  throw new Error("process.env.MITE_API_KEY missing");
}

if (!MITE_ACCOUNT_NAME) {
  throw new Error("process.env.MITE_ACCOUNT_NAME missing");
}

const port = PORT ? Number(PORT) : 3000;
const internalHost = `http://localhost:${port}`;

const apiClient = new ApiClient({
  apiKey: MITE_API_KEY,
  accountName: MITE_ACCOUNT_NAME,
});

const routes: Routes = {
  root: {
    path: "/",
    async handler(req: IncomingMessage, res: ServerResponse) {
      const url = new URL(req.url || "", internalHost);
      const date = url.searchParams.get("date") ?? undefined;

      const prevUrl = new URL(req.url || "", internalHost);
      prevUrl.searchParams.set("date", getPreviousDay(date));

      const nextUrl = new URL(req.url || "", internalHost);
      nextUrl.searchParams.set("date", getNextDay(date));

      const [services, timeEntries] = await Promise.all([
        apiClient.getServices(),
        apiClient.getTimeEntries({ at: date ?? "today" }),
      ]);

      const page = Page({
        title: "Mite Client",
        routes,
        services: services.map(({ service }) => service),
        timeEntries: (timeEntries as Array<{ time_entry: TimeEntry }>).map(
          ({ time_entry }) => time_entry
        ),
        date: date ?? "today",
        prevUrl: prevUrl.toString(),
        nextUrl: nextUrl.toString(),
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
      const date = params.get("date");

      await apiClient.addTimeEntry({
        serviceId: matchedService.service.id,
        minutes: minutes ? Number(minutes) : 0,
        note,
        date,
      });

      return handleRootRedirect(res, date ?? undefined);
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

      const minutes = params.get("minutes");
      const note = params.get("note");
      const date = params.get("date");

      await apiClient.editTimeEntry({
        timeEntryId: Number(timeEntryId),
        minutes: minutes ? Number(minutes) : 0,
        note,
        date,
      });

      return handleRootRedirect(res, date ?? undefined);
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

      const date = params.get("date");

      return handleRootRedirect(res, date ?? undefined);
    },
  },
  delete: {
    path: "/delete",
    async handler(req: IncomingMessage, res: ServerResponse) {
      if (req.method !== "POST") {
        throw new Error("Method Not Allowed");
      }

      const params = await parseBody(req);
      const timeEntryId = params.get("timeEntry");

      if (!timeEntryId) {
        throw new Error("Missing time entry");
      }

      const date = params.get("date");

      await apiClient.deleteTimeEntry({ timeEntryId: Number(timeEntryId) });

      return handleRootRedirect(res, date ?? undefined);
    },
  },
};

createServer(async (req, res) => {
  requireBasicAuth(req, res, async () => {
    for (const route of Object.values(routes)) {
      const url = new URL(req.url || "", internalHost);

      if (url.pathname === route.path) {
        return route
          .handler(req, res)
          .catch((error) => handleError(res, error));
      }
    }

    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("Not Found");
  });
}).listen(port, () => {
  console.log(`Server running at ${internalHost}`);
});
