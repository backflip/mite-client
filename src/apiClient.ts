import type {
  Customer,
  Project,
  Service,
  TimeEntriesQuery,
  TimeEntry,
  TimeEntryGroup,
  Tracker,
} from "../mite.js";

export class ApiClient {
  apiKey: string;
  endpoint: string;

  constructor({
    apiKey,
    accountName,
  }: {
    apiKey: string;
    accountName: string;
  }) {
    this.apiKey = apiKey;
    this.endpoint = `https://${accountName}.mite.de`;
  }

  async fetch(
    resource: string,
    options?: {
      method?: "GET" | "POST" | "PATCH" | "DELETE";
      body?: Object;
      query?: Record<string, string | number | boolean>;
    }
  ) {
    const url = new URL(`${this.endpoint}/${resource}`);

    if (options?.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        url.searchParams.set(key, value.toString());
      });
    }

    const response = await fetch(url.toString(), {
      method: options?.method ?? "GET",
      headers: {
        "X-MiteApiKey": this.apiKey,
        ...(options?.body && { "Content-Type": "application/json" }),
      },
      ...(options?.body && { body: JSON.stringify(options.body) }),
    });
    const data = (await response.json().catch(() => null)) as Record<
      string,
      any
    > | null;

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}: ${data?.error}`
      );
    }

    return data;
  }

  async getCustomers() {
    return this.fetch("customers.json") as Promise<
      Array<{
        customer: Customer;
      }>
    >;
  }

  async getProjects() {
    return this.fetch("projects.json") as Promise<
      Array<{
        project: Project;
      }>
    >;
  }

  async getServices() {
    return this.fetch("services.json") as Promise<
      Array<{
        service: Service;
      }>
    >;
  }

  async getTimeEntries(query: TimeEntriesQuery = {}) {
    return this.fetch("time_entries.json", { query }) as Promise<
      | Array<{ time_entry: TimeEntry }>
      | Array<{ time_entry_group: TimeEntryGroup }>
    >;
  }

  async addTimeEntry({
    serviceId,
    minutes,
    note,
    date,
  }: {
    serviceId: number;
    minutes: number;
    note: string | null;
    date: string | null;
  }) {
    const project = await this.#getProjectFromService(serviceId);

    return this.fetch("time_entries.json", {
      method: "POST",
      body: {
        time_entry: {
          service_id: serviceId,
          project_id: project.id,
          minutes,
          note,
          date_at: date,
        },
      },
    }) as Promise<{ time_entry: TimeEntry }>;
  }

  async editTimeEntry({
    timeEntryId,
    serviceId,
    minutes,
    note,
    date,
  }: {
    timeEntryId: number;
    serviceId: number;
    minutes: number;
    note: string | null;
    date: string | null;
  }) {
    const project = await this.#getProjectFromService(serviceId);

    return this.fetch(`time_entries/${timeEntryId}.json`, {
      method: "PATCH",
      body: {
        time_entry: {
          service_id: serviceId,
          project_id: project.id,
          minutes,
          note,
          date_at: date,
        },
      },
    }) as Promise<null>;
  }

  async toggleTimeEntry({ timeEntryId }: { timeEntryId: number }) {
    const currentTracker = (await this.fetch(`tracker.json`)) as {
      tracker: Tracker | {};
    };

    if (
      "tracking_time_entry" in currentTracker.tracker &&
      currentTracker.tracker.tracking_time_entry.id === timeEntryId
    ) {
      return this.fetch(`tracker/${timeEntryId}.json`, {
        method: "DELETE",
      }) as Promise<{
        tracker: Tracker;
      }>;
    }

    return this.fetch(`tracker/${timeEntryId}.json`, {
      method: "PATCH",
    }) as Promise<{
      tracker: Tracker;
    }>;
  }

  async deleteTimeEntry({ timeEntryId }: { timeEntryId: number }) {
    return this.fetch(`time_entries/${timeEntryId}.json`, {
      method: "DELETE",
    }) as Promise<null>;
  }

  async getService(service: string) {
    const services = await this.getServices();
    const matchedService = services.find(
      ({ service: item }) =>
        item.id === Number(service) || item.name === service
    );

    if (!matchedService) {
      throw new Error(`Service "${service}" not found`);
    }

    return matchedService.service;
  }

  unwrapServiceName(serviceName: string) {
    const [customerName, projectName, minimalServiceName] = serviceName
      .split("::")
      .map((s) => s.trim());

    return { customerName, projectName, minimalServiceName };
  }

  async #getProjectFromService(serviceId: number) {
    const service = (await this.fetch(`services/${serviceId}.json`)) as {
      service: Service;
    };
    const { customerName, projectName } = this.unwrapServiceName(
      service.service.name
    );
    const project = (await this.getProjects()).find(
      ({ project }) =>
        project.name === projectName && project.customer_name === customerName
    );

    if (!project) {
      throw new Error(`Project not found for service ${serviceId}`);
    }

    return project.project;
  }
}
