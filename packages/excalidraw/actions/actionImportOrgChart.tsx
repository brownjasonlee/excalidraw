import { CaptureUpdateAction } from "@excalidraw/element";

import { t } from "../i18n";
import { fileOpen } from "../data/filesystem";
import { isOrgChartData } from "../orgChart/types";
import { createOrgChartElements } from "../orgChart/serialize";

import { register } from "./register";

export const actionImportOrgChart = register({
  name: "importOrgChart",
  label: "labels.importOrgChart",
  perform: async (elements, appState, _, app) => {
    try {
      const file = await fileOpen({
        description: "Org chart data",
        extensions: ["json"],
      });
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isOrgChartData(parsed)) {
        return {
          appState: {
            ...appState,
            errorMessage: t("errors.invalidScene"),
          },
          captureUpdate: CaptureUpdateAction.EVENTUALLY,
        };
      }
      const existingIds = new Set(elements.map((element) => element.id));
      const newElements = createOrgChartElements(
        parsed,
        appState,
        existingIds,
      );
      const selectedElementIds = newElements.reduce<Record<string, true>>(
        (acc, element) => {
          if (!element.isDeleted) {
            acc[element.id] = true;
          }
          return acc;
        },
        {},
      );
      return {
        elements: [...elements, ...newElements],
        appState: {
          ...appState,
          selectedElementIds,
        },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      };
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.warn(error);
        return false;
      }
      return {
        appState: { ...appState, errorMessage: error.message },
        captureUpdate: CaptureUpdateAction.EVENTUALLY,
      };
    }
  },
});
