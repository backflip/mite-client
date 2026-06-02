import { createServer, IncomingMessage, ServerResponse } from "node:http";
import {
  formatMinutes,
  handleError,
  handleRootRedirect,
  parseBody,
  requireBasicAuth,
  port,
  getDate,
} from "./utils.ts";
import { ApiClient } from "./mite/apiClient.ts";
import { Page } from "./services/timeTracking/templates.ts";
import type { Routes } from "../types.js";
import type { TimeEntry } from "./mite/types.js";
import { InvoiceService } from "./services/invoice/invoiceService.ts";
import { TimeTrackingService } from "./services/timeTracking/timeTrackingService.ts";
import { Listing } from "./services/invoice/templates.ts";
import { Layout } from "./templates/layout.ts";

const { MITE_API_KEY, MITE_ACCOUNT_NAME } = process.env;

if (!MITE_API_KEY) {
  throw new Error("process.env.MITE_API_KEY missing");
}

if (!MITE_ACCOUNT_NAME) {
  throw new Error("process.env.MITE_ACCOUNT_NAME missing");
}

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
      const date = getDate(req);

      const [services, timeEntries] = await Promise.all([
        apiClient.getServices(),
        apiClient.getTimeEntries({ at: date }),
      ]);

      const page = await Page({
        req,
        routes,
        props: {
          services: services.map(({ service }) => service),
          timeEntries: (timeEntries as Array<{ time_entry: TimeEntry }>).map(
            ({ time_entry }) => time_entry
          ),
        },
      });
      const html = await Layout({
        ...page,
        req,
        routes,
        apiClient,
        title: date,
      });

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
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
  invoices: {
    path: "/invoices",
    async handler(req: IncomingMessage, res: ServerResponse) {
      const invoices = await apiClient.getInvoices();
      const page = await Listing({
        req,
        routes,
        props: {
          invoices,
        },
      });

      const html = await Layout({
        ...page,
        req,
        routes,
        apiClient,
        title: "Rechnungen",
      });

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    },
  },
  invoice: {
    path: "/invoice",
    async handler(req: IncomingMessage, res: ServerResponse) {
      if (req.method !== "POST") {
        throw new Error("Method Not Allowed");
      }

      const zip = await invoiceService.createInvoices();

      res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="invoices.zip"`,
      });
      res.end(zip);
    },
  },
  invoicePaid: {
    path: "/invoice-paid",
    async handler(req: IncomingMessage, res: ServerResponse) {
      if (req.method !== "POST") {
        throw new Error("Method Not Allowed");
      }

      const params = await parseBody(req);
      const invoiceId = params.get("id");

      if (!invoiceId) {
        throw new Error(`Missing "id"`);
      }

      const datePaidInput = params.get("date");
      const datePaid = datePaidInput ? new Date(datePaidInput) : new Date();

      await apiClient.markInvoiceAsPaid({
        invoiceId: Number(invoiceId),
        datePaid,
      });

      res.writeHead(302, { location: routes.invoices.path });
      res.end();
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

        res.write(`data: ${formatMinutes(Number(total))}\n\n`);
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

        res.write(`data: ${formatMinutes(Number(time))}\n\n`);
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
