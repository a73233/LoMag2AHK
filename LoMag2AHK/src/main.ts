import { invoke } from "@tauri-apps/api/tauri";
import * as XLSX from "xlsx";

let globalArray: number[] = [];

// let greetInputEl: HTMLInputElement | null;
// let greetMsgEl: HTMLElement | null;

// async function greet() {
//   if (greetMsgEl && greetInputEl) {
//     // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
//     greetMsgEl.textContent = await invoke("greet", {
//       name: greetInputEl.value,
//     });
//   }
// }

function readXLSFile(file: File): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const columnData: number[] = [];

      for (const cell in worksheet) {
        if (cell[0] === "A" && Number(cell.slice(1)) > 0) {
          const value = Number(worksheet[cell].v);
          if (!isNaN(value)) {
            columnData.push(value);
          }
        }
      }

      resolve(columnData);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
}

async function handleOpenFile() {
  try {
    const openFileDialog = document.createElement("input");
    openFileDialog.type = "file";
    openFileDialog.accept = ".xls";

    openFileDialog.addEventListener("change", async (event) => {
      const file = (event.target as HTMLInputElement)?.files?.[0];
      if (file) {
        const columnData = await readXLSFile(file);
        let mainMsgEl = document.querySelector("#main-msg");
        if (mainMsgEl && file) {
          mainMsgEl.textContent = "File Selected: " + file.name;
        }
        console.log("Column Data:", columnData);
        globalArray = columnData;
        // Use the column data as needed
      }
    });

    openFileDialog.click();
  } catch (error) {
    console.error("Error while opening the file:", error);
    // Handle the error
  }
}

// function createAhkScript(codigos: number[]): string {
//   const scriptLines = [
//     "!q:: ExitApp",
//     "^q:: ExitApp\n",
//     "!E:: ExitApp",
//     "^e:: ExitApp\n",
//     "!w:: Pause",
//     "^w:: Pause\n",
//     "!r:: Reload\n",
//     "!s::\n",
//     "xLoc := 26",
//     "yLoc := 73\n",
//     `Codigos := [${codigos.join(", ")}]\n`,
//     "for index, codigo in Codigos {",
//     "  Send, %codigo%",
//     "  Send, {Enter}",
//     "  Sleep, 1500",
//     "  PixelSearch, Px, Py, xLoc, yLoc, xLoc, yLoc, 0x00A4CF, 3, RGB",
//     "  if (ErrorLevel == 0) {",
//     "    Send, {Enter}",
//     "  }",
//     "}",
//   ];

//   const script = scriptLines.join("\n");
//   return script;
// }

async function handleAhkScript() {
  let xInput: HTMLInputElement | null;
  let yInput: HTMLInputElement | null;
  let colorInput: HTMLInputElement | null;

  let mainMsgEl = document.querySelector("#main-msg");
  xInput = document.querySelector("#x-input");
  yInput = document.querySelector("#y-input");
  colorInput = document.querySelector("#color-input");

  // let script: string = createAhkScript(globalArray);
  if (mainMsgEl && xInput && yInput && colorInput) {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    mainMsgEl.textContent = await invoke("write_file_to_desktop", {
      codigos: globalArray,
      x: xInput.value,
      y: yInput.value,
      color: colorInput.value,
    });
  }
  globalArray = [];
}

interface Configuration {
  x: string;
  y: string;
  color: string;
}

const writeConfigToFile = async () => {
  let xInput: HTMLInputElement | null;
  let yInput: HTMLInputElement | null;
  let colorInput: HTMLInputElement | null;
  let mainMsgEl: HTMLElement | null;

  xInput = document.querySelector("#x-input");
  yInput = document.querySelector("#y-input");
  colorInput = document.querySelector("#color-input");
  mainMsgEl = document.querySelector("#main-msg");

  let config: Configuration = {
    x: "",
    y: "",
    color: "",
  };

  if (xInput && yInput && colorInput) {
    config.x = xInput.value;
    config.y = yInput.value;
    config.color = colorInput.value;
  }

  try {
    const configJson = JSON.stringify(config);

    if (mainMsgEl) {
      mainMsgEl.textContent = await invoke("write_config_file", {
        file: "config.json",
        contents: configJson,
      });
    }
    console.log("Configuration saved to file.");
  } catch (error) {
    console.error("Error saving configuration to file:", error);
  }
};

const loadConfigFromFile = async () => {
  let xInput: HTMLInputElement | null;
  let yInput: HTMLInputElement | null;
  let colorInput: HTMLInputElement | null;

  xInput = document.querySelector("#x-input");
  yInput = document.querySelector("#y-input");
  colorInput = document.querySelector("#color-input");

  try {
    const fileContent = await invoke("read_config_file", {
      file: "config.json",
    });
    const config = JSON.parse(fileContent as string) as Configuration;
    if (xInput && yInput && colorInput) {
      xInput.value = config.x;
      yInput.value = config.y;
      colorInput.value = config.color;
    }
    console.log("Configuration loaded from file.");
  } catch (error) {
    console.error("Error loading configuration from file:", error);
  }
};

window.addEventListener("DOMContentLoaded", () => {
  // greetInputEl = document.querySelector("#greet-input");
  // greetMsgEl = document.querySelector("#greet-msg");
  document
    .querySelector("#select-button")
    ?.addEventListener("click", () => handleOpenFile());
});

window.addEventListener("DOMContentLoaded", () => {
  document
    .querySelector("#create-button")
    ?.addEventListener("click", () => handleAhkScript());
});

window.addEventListener("DOMContentLoaded", () => {
  // greetInputEl = document.querySelector("#greet-input");
  // greetMsgEl = document.querySelector("#greet-msg");
  document
    .querySelector("#titlebar-save")
    ?.addEventListener("click", () => writeConfigToFile());
});

document.addEventListener("keydown", function (event) {
  if (event.ctrlKey && event.key === "s") {
    // Execute your function here
    writeConfigToFile();
    event.preventDefault(); // Prevent the default browser behavior of saving the page
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // Function to be executed when the DOM is loaded
  loadConfigFromFile();
});
