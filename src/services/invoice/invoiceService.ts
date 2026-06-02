import puppeteer from "puppeteer";
import type { ApiClient } from "../../mite/apiClient.ts";
import { BlobReader, BlobWriter, ZipWriter } from "@zip.js/zip.js";
import { Pdf } from "./templates.ts";
import config from "../../../config.json" with { type: "json" };
import type { Invoice } from "../../../types.js";

export class InvoiceService {
  #apiClient: ApiClient;

  constructor({ apiClient }: { apiClient: ApiClient }) {
    this.#apiClient = apiClient;
  }

  async createInvoices() {
    const lastMonth = new Date().getDate() < 15;

    const query = {
      at: lastMonth ? "last_month" : "this_month",
      group_by: "service" as const,
    };

    const [tracking] = await this.#apiClient.getTimeEntries({
      ...query,
      tracking: true,
    });

    if (tracking) {
      throw new Error("Timer is running");
    }

    const [entryGroups, allCustomers, allProjects, allServices, allInvoices] =
      await Promise.all([
        this.#apiClient.getGroupedTimeEntries(query),
        this.#apiClient.getCustomers(),
        this.#apiClient.getProjects(),
        this.#apiClient.getServices(),
        this.#apiClient.getInvoices(),
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
          this.#apiClient.unwrapServiceName(service.name);

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
          customer: {
            name: customer.name,
            address: customer?.note?.split("\r\n") ?? [],
          },
          project,
        };
      }),
      ({ project }) => project.name
    );

    const lastId =
      allInvoices
        .map((invoice) => invoice.invoice.id)
        .sort((a, b) => b - a)[0] || config.lastInvoiceId;
    const year = new Date().getFullYear();
    const month = new Date().getMonth() - (lastMonth ? 1 : 0);
    const monthName = this.#getMonthName(month);

    const pdfs = await Promise.all(
      Object.values(projects)
        .filter((services) => services?.some(({ billable }) => billable))
        .filter((services) => {
          const { customer, project } = services?.[0] ?? {};

          if (!customer || !project) {
            throw new Error("Customer or project not found");
          }

          const existingInvoice = allInvoices.find(
            (invoice) =>
              invoice.project.id === project.id &&
              invoice.invoice.year === year &&
              invoice.invoice.month === month
          );

          return !existingInvoice;
        })
        .map(async (services, index) => {
          const { customer, project } = services?.[0] ?? {};

          if (!customer || !project) {
            throw new Error("Customer or project not found");
          }

          const id = lastId + index + 1;
          const dateCreated = new Date();
          const dateDue = this.getDueDate(dateCreated);

          const invoicedServices =
            services
              ?.filter(({ billable }) => billable)
              .map(({ service, minutes, rate }) => ({
                service,
                minutes,
                rate,
              })) ?? [];
          const total = invoicedServices.reduce(
            (sum, { minutes, rate }) => sum + rate * (minutes / 60),
            0
          );
          const vat = total * (config.vat / 100);

          const invoice: Invoice = {
            id,
            amount: total + vat,
            year,
            month,
            dateCreated,
            dateDue,
          };

          const markup = Pdf({
            invoice,
            project,
            services: invoicedServices,
            month: monthName,
            total,
            vat,
            customer,
            company: config.company,
          });
          const content = await this.#createPdf(markup);
          const name = `${this.#formatFileNamePart(customer?.name)}_${this.#formatFileNamePart(project.name)}_${this.#formatFileNamePart(monthName)}_${this.#formatFileNamePart(config.company.name)}.pdf`;

          return {
            invoice,
            project,
            name,
            content,
          };
        })
    );

    for (const pdf of pdfs) {
      await this.#apiClient.addInvoice({
        projectId: pdf.project.id,
        invoice: pdf.invoice,
      });
    }

    const zip = await this.#createZip(pdfs);

    console.log(`Created ${pdfs.length} invoices`);

    return Buffer.from(await zip.arrayBuffer());
  }

  getDueDate(date: Date) {
    const dueDate = new Date(date);

    dueDate.setDate(dueDate.getDate() + config.invoiceDeadline);

    return dueDate;
  }

  async #createPdf(html: string) {
    const browser = await puppeteer.launch({
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();

    await page.goto(`data:text/html,${html}`, {
      waitUntil: "networkidle2",
    });

    const pdf = await page.pdf();

    await browser.close();

    return Buffer.from(pdf);
  }

  async #createZip(files: Array<{ name: string; content: Buffer }>) {
    const zipWriter = new ZipWriter(new BlobWriter("application/zip"));

    await Promise.all(
      files.map(({ name, content }) =>
        zipWriter.add(name, new BlobReader(new Blob([content])))
      )
    );

    return zipWriter.close();
  }

  #formatFileNamePart(part?: string) {
    return part?.replace(/[^a-z0-9]/gi, "") ?? "";
  }

  #getMonthName(monthIndex: number) {
    return new Date(0, monthIndex).toLocaleString("de-CH", { month: "long" });
  }
}
