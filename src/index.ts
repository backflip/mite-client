import { createServer, IncomingMessage, ServerResponse } from "node:http";
import {
  getNextDay,
  getPreviousDay,
  handleError,
  handleRootRedirect,
  parseBody,
  requireBasicAuth,
} from "./utils.ts";
import { ApiClient } from "./mite/apiClient.ts";
import { Page } from "./services/timeTracking/templates.ts";
import type { Routes } from "../types.js";
import type { TimeEntry } from "./mite/types.js";
import { InvoiceService } from "./services/invoice/invoiceService.ts";
import { TimeTrackingService } from "./services/timeTracking/timeTrackingService.ts";

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

const timeTrackingService = new TimeTrackingService({ apiClient });
const invoiceService = new InvoiceService({ apiClient });

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
        prevUrl: prevUrl.toString().replace(internalHost, ""),
        nextUrl: nextUrl.toString().replace(internalHost, ""),
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
      const serviceId = params.get("service");
      const minutes = params.get("minutes");
      const note = params.get("note");
      const date = params.get("date");

      await timeTrackingService.add({
        serviceId,
        minutes,
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
      const serviceId = params.get("service");
      const minutes = params.get("minutes");
      const note = params.get("note");
      const date = params.get("date");

      await timeTrackingService.edit({
        timeEntryId,
        serviceId,
        minutes,
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

      await timeTrackingService.toggle({ timeEntryId });

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

      await timeTrackingService.delete({ timeEntryId });

      const date = params.get("date");

      return handleRootRedirect(res, date ?? undefined);
    },
  },
  invoice: {
    path: "/invoice",
    async handler(req: IncomingMessage, res: ServerResponse) {
      if (req.method !== "POST") {
        throw new Error("Method Not Allowed");
      }

      const zip = await invoiceService.getInvoices();

      res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="invoices.zip"`,
      });
      res.end(zip);
    },
  },
  total: {
    path: "/total",
    async handler(req: IncomingMessage, res: ServerResponse) {
      const url = new URL(req.url || "", internalHost);
      const date = url.searchParams.get("date");

      const interval = 30000;
      const update = async () => {
        const total = await timeTrackingService
          .getTotal({ date })
          .catch((err) => {
            console.log(err);

            return "";
          });

        res.write(`data: ${JSON.stringify(total)}\n\n`);
      };

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
      });

      update();
      setInterval(update, interval);
    },
  },
  tracking: {
    path: "/tracking",
    async handler(req: IncomingMessage, res: ServerResponse) {
      const interval = 30000;
      const update = async () => {
        const time = await timeTrackingService.getTrackedTime().catch((err) => {
          console.log(err);

          return "";
        });

        res.write(`data: ${JSON.stringify(time)}\n\n`);
      };

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
      });

      update();
      setInterval(update, interval);
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
