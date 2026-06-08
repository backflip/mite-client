import type { ApiClient } from "../../mite/apiClient.ts";
import { parseMinutes } from "../../utils.ts";

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
    const { time_entry: entry } = await this.#apiClient.addTimeEntry({
      serviceId: matchedService.id,
      minutes: minutes ? parseMinutes(minutes) : 0,
      note,
      date,
    });

    // Auto-start unless minutes have been entered
    if (minutes === "0:00") {
      await this.#apiClient.toggleTimeEntry({ timeEntryId: entry.id });
    }

    return entry;
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
      minutes: minutes ? parseMinutes(minutes) : 0,
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

  async getTotal({ date }: { date: Param }) {
    const entries = await this.#apiClient.getTimeEntries({
      at: date ?? "today",
    });
    const total = entries.reduce((acc, entry) => {
      acc += entry.time_entry.tracking?.minutes || entry.time_entry.minutes;

      return acc;
    }, 0);

    return total;
  }

  async getTrackedTime() {
    const { tracker } = await this.#apiClient.getTracker();
    const minutes =
      "tracking_time_entry" in tracker
        ? tracker.tracking_time_entry.minutes
        : 0;

    return minutes;
  }
}
