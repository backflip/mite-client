import { TrayIcon, TrayIconEvent } from "@tauri-apps/api/tray";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { moveWindow, Position } from "@tauri-apps/plugin-positioner";

const { VITE_IFRAME_URL } = import.meta.env;

if (!VITE_IFRAME_URL) {
  throw new Error("VITE_IFRAME_URL is not defined");
}

const window = getCurrentWindow();

const insertIframe = () => {
  const iframe = document.createElement("iframe");

  iframe.src = VITE_IFRAME_URL;

  document.body.appendChild(iframe);
};

const initTray = async () => {
  const tray = await TrayIcon.new({
    action: async (event: TrayIconEvent) => {
      switch (event.type) {
        case "Click": {
          if (event.buttonState === "Down") {
            break;
          }

          if (await window.isVisible()) {
            window.hide();
          } else {
            await window.show();
            await window.setFocus();

            moveWindow(Position.TrayCenter);
          }

          break;
        }
      }
    },
  });

  return tray;
};

const getEventSourceUrl = () => {
  // Safari won't send `authoraization` header so we pass it as query param
  const url = new URL(`${VITE_IFRAME_URL}/tracking`);
  const auth = btoa(`${url.username}:${url.password}`);

  url.searchParams.set("authorization", auth);

  return url.toString();
};

const watchTracker = async (tray: TrayIcon) => {
  const url = getEventSourceUrl();
  const eventSource = new EventSource(url);

  eventSource.addEventListener("message", (event) => {
    if (event.data !== "0:00") {
      tray.setTitle(`● ${event.data}`);
    } else {
      tray.setTitle(`○`);
    }
  });
};

const init = async () => {
  const tray = await initTray();

  tray.setTitle(`○`);

  watchTracker(tray);

  insertIframe();

  window.hide();
};

document.addEventListener("DOMContentLoaded", init);
