import type { ApiClient } from "../../mite/apiClient.ts";

type Param = ReturnType<URLSearchParams["get"]>;

export class TimeTrackingService {
  #apiClient: ApiClient;

  constructor({ apiClient }: { apiClient: ApiClient }) {
    this.#apiClient = apiClient;
  }

  async add({
    serviceId,
    minutes,
    note,
    date,
  }: {
    serviceId: Param;
    minutes: Param;
    note: Param;
    date: Param;
  }) {
    const matchedService = await this.#apiClient.getService(serviceId ?? "");

    await this.#apiClient.addTimeEntry({
      serviceId: matchedService.id,
      minutes: minutes ? Number(minutes) : 0,
      note,
      date,
    });
  }

  async edit({
    timeEntryId,
    serviceId,
    minutes,
    note,
    date,
  }: {
    timeEntryId: Param;
    serviceId: Param;
    minutes: Param;
    note: Param;
    date: Param;
  }) {
    const matchedService = await this.#apiClient.getService(serviceId ?? "");

    await this.#apiClient.editTimeEntry({
      timeEntryId: Number(timeEntryId),
      serviceId: matchedService.id,
      minutes: minutes ? Number(minutes) : 0,
      note,
      date,
    });
  }

  async toggle({ timeEntryId }: { timeEntryId: Param }) {
    await this.#apiClient.toggleTimeEntry({ timeEntryId: Number(timeEntryId) });
  }

  async delete({ timeEntryId }: { timeEntryId: Param }) {
    await this.#apiClient.deleteTimeEntry({ timeEntryId: Number(timeEntryId) });
  }
}
