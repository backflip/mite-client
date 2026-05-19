import puppeteer from "puppeteer";
import type { ApiClient } from "../../mite/apiClient.ts";
import { BlobReader, BlobWriter, ZipWriter } from "@zip.js/zip.js";
import { Page } from "./templates.ts";
import config from "../../../config.json" with { type: "json" };

export class InvoiceService {
  #apiClient: ApiClient;

  constructor({ apiClient }: { apiClient: ApiClient }) {
    this.#apiClient = apiClient;
  }

  async getInvoices() {
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

    const [entryGroups, allCustomers, allProjects, allServices] =
      await Promise.all([
        this.#apiClient.getGroupedTimeEntries(query),
        this.#apiClient.getCustomers(),
        this.#apiClient.getProjects(),
        this.#apiClient.getServices(),
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
    const monthName = this.#getMonthName(month);

    const pdfs = await Promise.all(
      Object.values(projects)
        .filter((services) => services?.some(({ billable }) => billable))
        .map(async (services, index) => {
          const { customer, project } = services?.[0] ?? {};

          if (!customer || !project) {
            throw new Error("Customer or project not found");
          }

          const number = `${new Date().getFullYear()}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;

          const markup = Page({
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
            company: config.company,
          });
          const content = await this.#createPdf(markup);
          const name = `${this.#formatFileNamePart(customer?.name)}_${this.#formatFileNamePart(project)}_${this.#formatFileNamePart(monthName)}_responsivech_GmbH.pdf`;

          return {
            name,
            content,
          };
        })
    );

    const zip = await this.#createZip(pdfs);

    return Buffer.from(await zip.arrayBuffer());
  }

  async #createPdf(html: string) {
    const browser = await puppeteer.launch();
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
