import OpenColor from "open-color";

import { CURSOR_TYPE, MIME_TYPES, THEME } from "@excalidraw/common";

import { isHandToolActive, isEraserActive } from "./appState";

import type { AppState, DataURL } from "./types";

export const resetCursor = (interactiveCanvas: HTMLCanvasElement | null) => {
  if (interactiveCanvas) {
    interactiveCanvas.style.cursor = "";
  }
};

export const setCursor = (
  interactiveCanvas: HTMLCanvasElement | null,
  cursor: string,
) => {
  if (interactiveCanvas) {
    interactiveCanvas.style.cursor = cursor;
  }
};

let eraserCanvasCache: any;
let previewDataURL: string;
export const setEraserCursor = (
  interactiveCanvas: HTMLCanvasElement | null,
  theme: AppState["theme"],
) => {
  const cursorImageSizePx = 20;

  const drawCanvas = () => {
    const isDarkTheme = theme === THEME.DARK;
    eraserCanvasCache = document.createElement("canvas");
    eraserCanvasCache.theme = theme;
    eraserCanvasCache.height = cursorImageSizePx;
    eraserCanvasCache.width = cursorImageSizePx;
    const context = eraserCanvasCache.getContext("2d")!;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(
      eraserCanvasCache.width / 2,
      eraserCanvasCache.height / 2,
      5,
      0,
      2 * Math.PI,
    );
    context.fillStyle = isDarkTheme ? OpenColor.black : OpenColor.white;
    context.fill();
    context.strokeStyle = isDarkTheme ? OpenColor.white : OpenColor.black;
    context.stroke();
    previewDataURL = eraserCanvasCache.toDataURL(MIME_TYPES.svg) as DataURL;
  };
  if (!eraserCanvasCache || eraserCanvasCache.theme !== theme) {
    drawCanvas();
  }

  setCursor(
    interactiveCanvas,
    `url(${previewDataURL}) ${cursorImageSizePx / 2} ${
      cursorImageSizePx / 2
    }, auto`,
  );
};

export const setCursorForShape = (
  interactiveCanvas: HTMLCanvasElement | null,
  appState: Pick<AppState, "activeTool" | "theme">,
) => {
  if (!interactiveCanvas) {
    return;
  }
  if (appState.activeTool.type === "selection") {
    resetCursor(interactiveCanvas);
  } else if (isHandToolActive(appState)) {
    interactiveCanvas.style.cursor = CURSOR_TYPE.GRAB;
  } else if (isEraserActive(appState)) {
    setEraserCursor(interactiveCanvas, appState.theme);
    // do nothing if image tool is selected which suggests there's
    // a image-preview set as the cursor
    // Ignore custom type as well and let host decide
  } else if (!["image", "custom"].includes(appState.activeTool.type)) {
    interactiveCanvas.style.cursor = CURSOR_TYPE.CROSSHAIR;
  } else if (appState.activeTool.type !== "image") {
    interactiveCanvas.style.cursor = CURSOR_TYPE.AUTO;
  }
};
