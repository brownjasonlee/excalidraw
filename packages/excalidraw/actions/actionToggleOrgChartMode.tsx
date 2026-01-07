import { CaptureUpdateAction } from "@excalidraw/element";

import { gridIcon } from "../components/icons";
import { t } from "../i18n";
import { register } from "./register";

export const actionToggleOrgChartMode = register({
  name: "orgChartMode",
  label: "labels.orgChartMode",
  icon: gridIcon,
  viewMode: false,
  perform: (elements, appState) => {
    const nextEnabled = !appState.orgChartModeEnabled;
    return {
      appState: {
        ...appState,
        orgChartModeEnabled: nextEnabled,
        toast: {
          message: t(
            nextEnabled
              ? "toast.orgChartModeEnabled"
              : "toast.orgChartModeDisabled",
          ),
        },
      },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  checked: (appState) => appState.orgChartModeEnabled,
});
