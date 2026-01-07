import { arrayToMap } from "@excalidraw/common";
import { getFontString, getLineHeight } from "@excalidraw/common";

import {
  CaptureUpdateAction,
  getBoundTextElement,
  getNonDeletedElements,
  hasBoundTextElement,
  isBindableElement,
  newElementWith,
  newTextElement,
  syncMovedIndices,
} from "@excalidraw/element";

import { measureText } from "@excalidraw/element";

import type {
  ExcalidrawBindableElement,
  ExcalidrawElement,
} from "@excalidraw/element/types";

import { ToolButton } from "../components/ToolButton";
import { TextIcon } from "../components/icons";
import { t } from "../i18n";
import { isSomeElementSelected } from "../scene";

import { register } from "./register";

import type { AppClassProperties, AppState } from "../types";

const getSelectedNode = (
  app: AppClassProperties,
  appState: AppState,
): ExcalidrawBindableElement | null => {
  const selectedElements = app.scene.getSelectedElements({
    selectedElementIds: appState.selectedElementIds,
    includeBoundTextElement: true,
  });

  if (selectedElements.length === 1) {
    return isBindableElement(selectedElements[0]) ? selectedElements[0] : null;
  }

  if (selectedElements.length === 2) {
    const container = selectedElements.find((element) =>
      hasBoundTextElement(element),
    );
    return container && isBindableElement(container) ? container : null;
  }

  return null;
};

const buildLabelTextElement = (
  container: ExcalidrawBindableElement,
  label: string,
  appState: AppState,
) => {
  const lineHeight = getLineHeight(
    appState.currentItemFontFamily,
    appState.currentItemFontSize,
  );
  const font = getFontString({
    fontFamily: appState.currentItemFontFamily,
    fontSize: appState.currentItemFontSize,
    lineHeight,
  });
  const metrics = measureText(label, font, lineHeight);

  return newTextElement({
    x: container.x + (container.width - metrics.width) / 2,
    y: container.y + (container.height - metrics.height) / 2,
    text: label,
    width: metrics.width,
    height: metrics.height,
    fontFamily: appState.currentItemFontFamily,
    fontSize: appState.currentItemFontSize,
    lineHeight,
    textAlign: "center",
    verticalAlign: "middle",
    strokeColor: container.strokeColor,
    containerId: container.id,
    autoResize: true,
  });
};

const insertTextAfterContainer = (
  elements: readonly ExcalidrawElement[],
  container: ExcalidrawElement,
  textElement: ExcalidrawElement,
) => {
  const nextElements = elements.slice();
  const containerIndex = nextElements.findIndex(
    (element) => element.id === container.id,
  );
  if (containerIndex === -1) {
    return elements;
  }
  nextElements.splice(containerIndex + 1, 0, textElement);
  syncMovedIndices(nextElements, arrayToMap([container, textElement]));
  return nextElements;
};

export const actionOrgChartLabel = register({
  name: "orgChartLabel",
  label: "labels.orgChartSetLabel",
  icon: TextIcon,
  predicate: (_elements, appState, __, app) =>
    appState.orgChartModeEnabled && Boolean(getSelectedNode(app, appState)),
  perform: (elements, appState, _, app) => {
    const container = getSelectedNode(app, appState);
    if (!container || !appState.orgChartModeEnabled) {
      return false;
    }

    const elementsMap = arrayToMap(elements);
    const boundText = getBoundTextElement(container, elementsMap);
    const currentLabel =
      container.customData?.orgChart?.type === "node"
        ? container.customData.orgChart.name
        : boundText?.text || "";

    const nextLabel = window.prompt(
      t("labels.orgChartSetLabelPrompt"),
      currentLabel,
    );
    if (!nextLabel) {
      return false;
    }

    const nextContainer = newElementWith(container, {
      customData: {
        ...container.customData,
        orgChart: {
          type: "node",
          nodeId:
            container.customData?.orgChart?.type === "node"
              ? container.customData.orgChart.nodeId
              : container.id,
          name: nextLabel,
          attributes:
            container.customData?.orgChart?.type === "node"
              ? container.customData.orgChart.attributes
              : [],
        },
      },
    });

    let nextElements = elements.map((element) =>
      element.id === nextContainer.id ? nextContainer : element,
    );

    if (boundText) {
      const lineHeight = getLineHeight(
        appState.currentItemFontFamily,
        appState.currentItemFontSize,
      );
      const font = getFontString({
        fontFamily: appState.currentItemFontFamily,
        fontSize: appState.currentItemFontSize,
        lineHeight,
      });
      const metrics = measureText(nextLabel, font, lineHeight);
      const nextText = newElementWith(boundText, {
        text: nextLabel,
        originalText: nextLabel,
        width: metrics.width,
        height: metrics.height,
        x: nextContainer.x + (nextContainer.width - metrics.width) / 2,
        y: nextContainer.y + (nextContainer.height - metrics.height) / 2,
      });
      nextElements = nextElements.map((element) =>
        element.id === nextText.id ? nextText : element,
      );
    } else {
      const textElement = buildLabelTextElement(
        nextContainer,
        nextLabel,
        appState,
      );
      const updatedContainer = newElementWith(nextContainer, {
        boundElements: (nextContainer.boundElements || []).concat({
          id: textElement.id,
          type: "text",
        }),
      });
      nextElements = nextElements.map((element) =>
        element.id === updatedContainer.id ? updatedContainer : element,
      );
      nextElements = insertTextAfterContainer(
        nextElements,
        updatedContainer,
        textElement,
      );
    }

    return {
      elements: nextElements,
      appState,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  PanelComponent: ({ elements, appState, updateData, app }) => (
    <ToolButton
      hidden={!appState.orgChartModeEnabled || !getSelectedNode(app, appState)}
      type="button"
      icon={TextIcon}
      onClick={() => updateData(null)}
      title={t("labels.orgChartSetLabel")}
      aria-label={t("labels.orgChartSetLabel")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    />
  ),
});
