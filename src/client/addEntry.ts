import { ApiClient } from "../apiClient.ts";
import html from "../utils.ts";

export class AddEntry extends HTMLElement {
  apiClient: ApiClient;

  constructor() {
    super();

    this.apiClient = new ApiClient({
      apiKey: process.env.MITE_API_KEY!,
      accountName: process.env.MITE_ACCOUNT_NAME!,
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
            ${services
              .map(
                ({ service }) =>
                  html`<option value="${service.id}">${service.name}</option>`,
              )
              .join("")}
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

  handleSubmit = async (event: Event) => {
    event.preventDefault();

    const formData = new FormData(this.querySelector("form")!);
    const service = formData.get("service");

    if (!service) {
      // return handleError(res, new Error("Missing service"));
      return;
    }

    const services = await this.apiClient.getServices();
    const matchedService = services.find(
      ({ service: item }) => item.id === Number(service),
    );

    if (!matchedService) {
      // return handleError(res, new Error("Service not found"));
      return;
    }

    const minutes = formData.get("minutes");
    const note = formData.get("note");

    await this.apiClient.addTimeEntry({
      serviceId: matchedService.service.id,
      minutes: minutes ? Number(minutes) : 0,
      note: note ? String(note) : null,
    });

    this.querySelector("form")!.reset();
  };
}
