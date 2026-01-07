import { arrayToMap, randomId } from "@excalidraw/common";
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
import { adjustmentsIcon } from "../components/icons";
import { t } from "../i18n";
import { isSomeElementSelected } from "../scene";
import { getOrgChartNodeLabelText } from "../orgChart/labels";

import { register } from "./register";

import type { AppClassProperties, AppState } from "../types";
import type { OrgChartAttribute, OrgChartElementData } from "../orgChart/types";

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

const formatAttributes = (attributes?: OrgChartAttribute[]) => {
  if (!attributes?.length) {
    return "";
  }
  return attributes
    .map((attr) => {
      if (!attr.name) {
        return "";
      }
      const value = attr.value ? `=${attr.value}` : "";
      const color = attr.color ? `#${attr.color.replace("#", "")}` : "";
      return `${attr.name}${value}${color}`;
    })
    .filter(Boolean)
    .join("; ");
};

const parseAttributes = (input: string): OrgChartAttribute[] => {
  return input
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [left, colorPart] = entry.split("#");
      const [name, value] = left.split("=").map((part) => part.trim());
      return {
        id: randomId(),
        name,
        value: value || undefined,
        color: colorPart ? `#${colorPart.trim()}` : undefined,
        display: "label",
      };
    })
    .filter((attr) => Boolean(attr.name));
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

export const actionOrgChartAttributes = register({
  name: "orgChartAttributes",
  label: "labels.orgChartSetAttributes",
  icon: adjustmentsIcon,
  predicate: (_elements, appState, __, app) =>
    appState.orgChartModeEnabled && Boolean(getSelectedNode(app, appState)),
  perform: (elements, appState, _, app) => {
    const container = getSelectedNode(app, appState);
    if (!container || !appState.orgChartModeEnabled) {
      return false;
    }

    const elementsMap = arrayToMap(elements);
    const boundText = getBoundTextElement(container, elementsMap);
    const existingData =
      container.customData?.orgChart?.type === "node"
        ? container.customData.orgChart
        : null;
    const currentAttributes = existingData?.attributes || [];
    const nextRaw = window.prompt(
      t("labels.orgChartSetAttributesPrompt"),
      formatAttributes(currentAttributes),
    );
    if (nextRaw === null) {
      return false;
    }

    const nextAttributes = parseAttributes(nextRaw);
    const nextData: OrgChartElementData = {
      type: "node",
      nodeId: existingData?.nodeId || container.id,
      name: existingData?.name || boundText?.text || "Node",
      attributes: nextAttributes,
    };

    const nextContainer = newElementWith(container, {
      customData: {
        ...container.customData,
        orgChart: nextData,
      },
    });

    const labelText = getOrgChartNodeLabelText(nextData);
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
      const metrics = measureText(labelText, font, lineHeight);
      const nextText = newElementWith(boundText, {
        text: labelText,
        originalText: labelText,
        width: metrics.width,
        height: metrics.height,
        x: nextContainer.x + (nextContainer.width - metrics.width) / 2,
        y: nextContainer.y + (nextContainer.height - metrics.height) / 2,
      });
      nextElements = nextElements.map((element) =>
        element.id === nextText.id ? nextText : element,
      );
    } else if (labelText) {
      const textElement = buildLabelTextElement(
        nextContainer,
        labelText,
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
      icon={adjustmentsIcon}
      onClick={() => updateData(null)}
      title={t("labels.orgChartSetAttributes")}
      aria-label={t("labels.orgChartSetAttributes")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    />
  ),
});
