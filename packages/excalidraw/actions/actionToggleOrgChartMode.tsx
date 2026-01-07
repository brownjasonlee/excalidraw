import { CaptureUpdateAction } from "@excalidraw/element";

import { gridIcon } from "../components/icons";
import { register } from "./register";

export const actionToggleOrgChartMode = register({
  name: "orgChartMode",
  label: "labels.orgChartMode",
  icon: gridIcon,
  viewMode: false,
  perform: (elements, appState) => {
    return {
      appState: {
        ...appState,
        orgChartModeEnabled: !appState.orgChartModeEnabled,
      },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  checked: (appState) => appState.orgChartModeEnabled,
});
