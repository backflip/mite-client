import type { Service, TimeEntry } from "../../mite/types.js";
import type { GetPage, Routes } from "../../../types.js";
import html, { formatMinutes, getDate } from "../../utils.ts";
import { Icon } from "../../templates/layout.ts";

const customStyles = html`<style>
  .grid {
    display: grid;
    grid-template-columns: auto 7rem 3rem 3rem;
    gap: 0.5rem;

    .grid {
      display: contents;
    }
  }

  .add {
    background: var(--color-bg-mute);
    margin: calc(-1 * var(--page-padding));
    margin-block-end: 1.5rem;
    padding: var(--page-padding);
  }

  .entry-form {
    .field--service {
      grid-column: 1 / 4;
    }
    .field--note {
      grid-column: 1 / 2;
    }
    .field--minutes {
      grid-column: 2 / 4;
    }
  }

  .entries {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    form {
      display: contents;
    }

    .field--minutes {
      grid-column: 2 / 3;
    }

    .action--submit {
      grid-column: 4;
    }

    .action--toggle {
      background: transparent;
      grid-row: 2;
      grid-column: 3;
    }
    .action--delete {
      background: var(--color-delete);
      grid-row: 1;
      grid-column: 4;
    }

    .entry:has(.action--toggle[aria-pressed="true"]) {
      .field--minutes input,
      .action--toggle {
        background: var(--color-active);
      }
    }
  }
</style>`;

const MinutesInput = ({ minutes }: { minutes: number }) => {
  return html`<input
    type="text"
    inputmode="numeric"
    pattern="(?:[0-9]*:)?(?:[0-5])?[0-9]"
    name="minutes"
    id="minutes"
    placeholder="Minutes"
    value="${formatMinutes(minutes)}"
  />`;
};

const Entry = ({
  routes,
  services,
  entry,
  date,
  autoFocus,
}: {
  routes: Routes;
  services: Service[];
  date: string;
  entry?: TimeEntry;
  autoFocus?: boolean;
}) => {
  return html`<form
      action="${entry ? routes.edit.path : routes.add.path}"
      method="POST"
      class="entry-form grid"
    >
      <input type="hidden" name="date" value="${date}" />
      ${entry
        ? html`<input type="hidden" name="timeEntry" value="${entry.id}" />`
        : ""}

      <div class="field field--service">
        <label for="service" class="visually-hidden">Service</label>
        <input
          type="text"
          name="service"
          id="service"
          required
          list="services"
          placeholder="Service"
          value="${entry?.service_name ?? ""}"
          ${autoFocus ? "autofocus" : ""}
        />
        <datalist id="services">
          ${services
            .map(
              (service) =>
                html`<option value="${service.id}">${service.name}</option>`
            )
            .join("")}
        </datalist>
      </div>
      <div class="field field--note">
        <label for="note" class="visually-hidden">Note</label>
        <input
          type="text"
          name="note"
          id="note"
          placeholder="Note"
          value="${entry?.note ?? ""}"
        />
      </div>
      <div class="field field--minutes">
        <label for="minutes" class="visually-hidden">Minutes</label>
        ${entry?.tracking
          ? html`<mite-tracking>
              ${MinutesInput({
                minutes: entry.tracking.minutes || entry?.minutes || 0,
              })}
            </mite-tracking>`
          : MinutesInput({
              minutes: entry?.tracking?.minutes || entry?.minutes || 0,
            })}
      </div>

      <button type="submit" class="action action--submit">
        ${entry
          ? Icon({ icon: "💾", label: "Save" })
          : Icon({ icon: "➕", label: "Add" })}
      </button>
    </form>
    ${entry
      ? html`<form action="${routes.toggle.path}" method="POST">
            <input type="hidden" name="date" value="${date}" />
            <input type="hidden" name="timeEntry" value="${entry.id}" />
            <button
              type="submit"
              class="action action--toggle"
              aria-pressed="${!!entry.tracking}"
            >
              ${!!entry.tracking
                ? Icon({ icon: "⏸️", label: "Pause" })
                : Icon({ icon: "▶️", label: "Play" })}
            </button>
          </form>
          <form action="${routes.delete.path}" method="POST">
            <input type="hidden" name="date" value="${date}" />
            <input type="hidden" name="timeEntry" value="${entry.id}" />
            <button type="submit" class="action action--delete">
              ${Icon({ icon: "🗑️", label: "Delete" })}
            </button>
          </form>`
      : ""}`;
};

export const Page: GetPage<{
  services: Service[];
  timeEntries: TimeEntry[];
}> = async ({ req, routes, props: { services, timeEntries } }) => {
  const date = getDate(req);
  const content = html`<div class="add">
      ${Entry({
        routes,
        services,
        date,
        autoFocus: date === "today",
      })}
    </div>

    <ul role="list" class="entries">
      ${timeEntries
        .map(
          (entry) =>
            html`<li class="grid entry">
              ${Entry({
                routes,
                services,
                entry,
                date,
              })}
            </li>`
        )
        .join("")}
    </ul>`;

  return {
    content,
    customStyles,
  };
};
