"use strict";
(() => {
  // src/apiClient.ts
  var ApiClient = class {
    apiKey;
    endpoint;
    constructor({
      apiKey,
      accountName
    }) {
      this.apiKey = apiKey;
      this.endpoint = `https://${accountName}.mite.de`;
    }
    async fetch(resource, options) {
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
          ...options?.body && { "Content-Type": "application/json" }
        },
        ...options?.body && { body: JSON.stringify(options.body) }
      });
      const data = await response.json().catch(() => null);
      return data;
    }
    async getCustomers() {
      return this.fetch("customers.json");
    }
    async getProjects() {
      return this.fetch("projects.json");
    }
    async getServices() {
      return this.fetch("services.json");
    }
    async getTimeEntries(query = {}) {
      return this.fetch("time_entries.json", { query });
    }
    async getTimeEntriesToday() {
      return this.getTimeEntries({ at: "today" });
    }
    async addTimeEntry({
      serviceId,
      minutes,
      note
    }) {
      const service = await this.fetch(`services/${serviceId}.json`);
      const [customerName, projectName] = service.service.name.split("::").map((s) => s.trim());
      const project = (await this.getProjects()).find(
        ({ project: project2 }) => project2.name === projectName && project2.customer_name === customerName
      );
      if (!project) {
        throw new Error(`Project not found for service ${serviceId}`);
      }
      return this.fetch("time_entries.json", {
        method: "POST",
        body: {
          time_entry: {
            service_id: serviceId,
            project_id: project?.project.id,
            minutes,
            note
          }
        }
      });
    }
    async editTimeEntry({
      timeEntryId,
      note
    }) {
      return this.fetch(`time_entries/${timeEntryId}.json`, {
        method: "PATCH",
        body: {
          time_entry: {
            note
          }
        }
      });
    }
    async toggleTimeEntry({ timeEntryId }) {
      const currentTracker = await this.fetch(`tracker.json`);
      if ("tracking_time_entry" in currentTracker.tracker && currentTracker.tracker.tracking_time_entry.id === timeEntryId) {
        return this.fetch(`tracker/${timeEntryId}.json`, {
          method: "DELETE"
        });
      }
      return this.fetch(`tracker/${timeEntryId}.json`, {
        method: "PATCH"
      });
    }
  };

  // src/utils.ts
  function html(strings, ...values) {
    return String.raw({ raw: strings }, ...values);
  }

  // src/client/addEntry.ts
  var AddEntry = class extends HTMLElement {
    apiClient;
    constructor() {
      super();
      this.apiClient = new ApiClient({
        apiKey: "bd116d545474a655",
        accountName: "responsive"
      });
    }
    connectedCallback() {
      this.render();
      this.addEventListener("submit", this.handleSubmit);
    }
    async render() {
      const services = await this.apiClient.getServices().catch((err) => {
        console.error(err);
        return [];
      });
      this.innerHTML = html`<form action="/add" method="POST" class="add">
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
            ${services.map(
        ({ service }) => html`<option value="${service.id}">${service.name}</option>`
      ).join("")}
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
    </form>`;
    }
    handleSubmit = async (event) => {
      event.preventDefault();
      const formData = new FormData(this.querySelector("form"));
      const service = formData.get("service");
      if (!service) {
        return;
      }
      const services = await this.apiClient.getServices();
      const matchedService = services.find(
        ({ service: item }) => item.id === Number(service)
      );
      if (!matchedService) {
        return;
      }
      const minutes = formData.get("minutes");
      const note = formData.get("note");
      await this.apiClient.addTimeEntry({
        serviceId: matchedService.service.id,
        minutes: minutes ? Number(minutes) : 0,
        note: note ? String(note) : null
      });
      this.querySelector("form").reset();
    };
  };

  // src/client/index.ts
  customElements.define("mite-add", AddEntry);
})();
