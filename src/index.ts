import { createServer, IncomingMessage, ServerResponse } from "node:http";
import {
  createPdf,
  createZip,
  formatFileNamePart,
  formatMinutes,
  getMonthName,
  getNextDay,
  getPreviousDay,
  handleError,
  handleRootRedirect,
  parseBody,
  requireBasicAuth,
} from "./utils.ts";
import { ApiClient } from "./apiClient.ts";
import html, { InvoicePage, Page } from "./templates.ts";
import type { Routes } from "../types.js";
import type { TimeEntry, TimeEntryGroup } from "../mite.js";

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

      const matchedService = await apiClient.getService(service ?? "");

      const minutes = params.get("minutes");
      const note = params.get("note");
      const date = params.get("date");

      await apiClient.addTimeEntry({
        serviceId: matchedService.id,
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
      const service = params.get("service");

      if (!timeEntryId) {
        throw new Error("Missing time entry");
      }

      const matchedService = await apiClient.getService(service ?? "");

      const minutes = params.get("minutes");
      const note = params.get("note");
      const date = params.get("date");

      await apiClient.editTimeEntry({
        timeEntryId: Number(timeEntryId),
        serviceId: matchedService.id,
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
  invoice: {
    path: "/invoice",
    async handler(req: IncomingMessage, res: ServerResponse) {
      if (req.method !== "POST") {
        throw new Error("Method Not Allowed");
      }

      const lastMonth = new Date().getDate() < 15;

      const query = {
        at: lastMonth ? "last_month" : "this_month",
        group_by: "service" as const,
      };

      const [tracking] = await apiClient.getTimeEntries({
        ...query,
        tracking: true,
      });

      if (tracking) {
        throw new Error("Timer is running");
      }

      const [entryGroups, allCustomers, allProjects, allServices] =
        await Promise.all([
          apiClient.getTimeEntries(query) as Promise<
            Array<{ time_entry_group: TimeEntryGroup }>
          >,
          apiClient.getCustomers(),
          apiClient.getProjects(),
          apiClient.getServices(),
        ]);

      const projects = Object.groupBy(
        entryGroups.map(({ time_entry_group }) => {
          const service = allServices.find(
            ({ service }) =>
              "service_id" in time_entry_group &&
              service.id === time_entry_group.service_id
          )?.service;

          if (!service) {
            throw new Error(
              `Service "${"service_id" in time_entry_group ? time_entry_group.service_id : "unknown"}" not found`
            );
          }

          const { customerName, projectName, minimalServiceName } =
            apiClient.unwrapServiceName(service.name);

          const customer = allCustomers.find(
            ({ customer }) => customer.name === customerName
          )?.customer;

          if (!customer) {
            throw new Error(`Customer "${customerName}" not found`);
          }

          const project = allProjects.find(
            ({ project }) => project.name === projectName
          )?.project;

          if (!project) {
            throw new Error(`Project "${projectName}" not found`);
          }

          return {
            minutes: time_entry_group.minutes,
            service: String(minimalServiceName),
            billable: service.billable,
            rate:
              (service.hourly_rate ||
                project.hourly_rate ||
                customer.hourly_rate ||
                0) / 100,
            project: String(projectName),
            customer: {
              name: customer.name,
              address: customer?.note?.split("\r\n") ?? [],
            },
          };
        }),
        ({ project }) => project
      );

      const month = new Date().getMonth() - (lastMonth ? 1 : 0);
      const monthName = getMonthName(month);

      const pdfs = await Promise.all(
        Object.values(projects)
          .filter((services) => services?.some(({ billable }) => billable))
          .map(async (services, index) => {
            const { customer, project } = services?.[0] ?? {};

            if (!customer || !project) {
              throw new Error("Customer or project not found");
            }

            const number = `${new Date().getFullYear()}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;

            const markup = InvoicePage({
              services:
                services
                  ?.filter(({ billable }) => billable)
                  .map(({ service, minutes, rate }) => ({
                    service,
                    minutes,
                    rate,
                  })) ?? [],
              month: monthName,
              customer,
              number,
            });
            const content = await createPdf(markup);
            const name = `${formatFileNamePart(customer?.name)}_${formatFileNamePart(project)}_${formatFileNamePart(monthName)}_responsivech_GmbH.pdf`;

            return {
              name,
              content,
            };
          })
      );

      const zip = await createZip(pdfs);

      res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="invoices.zip"`,
      });
      res.end(Buffer.from(await zip.arrayBuffer()));
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
