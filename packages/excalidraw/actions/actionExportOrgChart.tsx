import { CaptureUpdateAction } from "@excalidraw/element";

import { t } from "../i18n";
import { fileSave } from "../data/filesystem";
import { buildOrgChartData } from "../orgChart/serialize";

import { register } from "./register";

export const actionExportOrgChart = register({
  name: "exportOrgChart",
  label: "labels.exportOrgChart",
  perform: async (elements, appState, _, app) => {
    try {
      const selectedElements = app.scene.getSelectedElements({
        selectedElementIds: appState.selectedElementIds,
        includeBoundTextElement: true,
      });
      const orgData = buildOrgChartData(elements, selectedElements);
      const serialized = JSON.stringify(orgData, null, 2);
      const blob = new Blob([serialized], { type: "application/json" });
      await fileSave(blob, {
        name: appState.name || "org-chart",
        extension: "json",
        description: "Org chart data",
      });
      return {
        appState: {
          ...appState,
          toast: { message: t("toast.fileSaved") },
        },
        captureUpdate: CaptureUpdateAction.EVENTUALLY,
      };
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        console.error(error);
      }
      return false;
    }
  },
});
