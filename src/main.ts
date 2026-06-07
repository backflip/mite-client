import { TrayIcon, TrayIconEvent } from "@tauri-apps/api/tray";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { moveWindow, Position } from "@tauri-apps/plugin-positioner";

const window = getCurrentWindow();

const tray = await TrayIcon.new({
  // icon: "../src/assets/sample.png",
  // iconAsTemplate: true,
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

const setTrayTitle = () => {
  const date = new Date();
  const minutes = date.getMinutes().toString().padStart(2, "0");

  tray.setTitle(`●○ 0:${minutes}`);
};

window.hide();

setTrayTitle();

setInterval(() => {
  setTrayTitle();
}, 30000);
