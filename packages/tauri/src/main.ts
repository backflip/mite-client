import { Menu } from "@tauri-apps/api/menu";
import { TrayIcon, TrayIconEvent } from "@tauri-apps/api/tray";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { moveWindow, Position } from "@tauri-apps/plugin-positioner";
import { exit } from "@tauri-apps/plugin-process";

const { VITE_IFRAME_URL } = import.meta.env;

if (!VITE_IFRAME_URL) {
  throw new Error("VITE_IFRAME_URL is not defined");
}

let tray: TrayIcon | undefined;
let iframe: HTMLIFrameElement | undefined;
let eventSource: EventSource | undefined;

const window = getCurrentWindow();

const insertIframe = () => {
  if (iframe) {
    iframe.remove();
  }

  iframe = document.createElement("iframe");
  iframe.src = VITE_IFRAME_URL;

  document.body.appendChild(iframe);
};

const initTray = async () => {
  const menu = await Menu.new({
    items: [
      {
        id: "reload",
        text: "Reload",
        action() {
          render();
        },
      },
      {
        id: "quit",
        text: "Quit",
        async action() {
          await exit(0);
        },
      },
    ],
  });
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
    menu,
    showMenuOnLeftClick: false,
    title: `○`,
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

const watchTracker = async () => {
  if (!tray) {
    return;
  }

  const url = getEventSourceUrl();

  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource(url);

  eventSource.addEventListener("message", (event) => {
    if (event.data !== "0:00") {
      tray!.setTitle(`● ${event.data}`);
    } else {
      tray!.setTitle(`○`);
    }
  });
};

const render = () => {
  watchTracker();
  insertIframe();
};

const init = async () => {
  tray = await initTray();

  render();

  window.hide();
};

document.addEventListener("DOMContentLoaded", init);
