import {
  DEFAULT_ELEMENT_PROPS,
  TEXT_ALIGN,
  VERTICAL_ALIGN,
  arrayToMap,
  randomId,
  getFontString,
  getLineHeight,
} from "@excalidraw/common";

import { pointFrom } from "@excalidraw/math";

import {
  calculateFixedPointForNonElbowArrowBinding,
  getBoundTextElement,
  getCommonBounds,
  getElementBounds,
  getNonDeletedElements,
  isArrowElement,
  isBindableElement,
  newArrowElement,
  newElement,
  newTextElement,
  updateBoundPoint,
} from "@excalidraw/element";

import { newElementWith } from "@excalidraw/element";
import { measureText } from "@excalidraw/element";

import type { AppState } from "../types";
import type {
  ExcalidrawArrowElement,
  ExcalidrawBindableElement,
  ExcalidrawElement,
  ExcalidrawTextElement,
  NonDeleted,
} from "@excalidraw/element/types";

import {
  ORG_CHART_VERSION,
  type OrgChartData,
  type OrgChartElementData,
} from "./types";

const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 100;

const getOrgChartData = (
  element: ExcalidrawElement,
): OrgChartElementData | null =>
  (element.customData?.orgChart as OrgChartElementData | undefined) || null;

const getNodeName = (
  element: ExcalidrawBindableElement,
  elementsMap: Map<string, ExcalidrawElement>,
) => {
  const orgData = getOrgChartData(element);
  if (orgData?.type === "node" && orgData.name) {
    return orgData.name;
  }
  const boundText = getBoundTextElement(element, elementsMap);
  return boundText?.text || "Node";
};

const getRelationshipLabel = (
  arrow: ExcalidrawArrowElement,
  elementsMap: Map<string, ExcalidrawElement>,
) => {
  const orgData = getOrgChartData(arrow);
  if (orgData?.type === "relationship" && orgData.label) {
    return orgData.label;
  }
  const boundText = getBoundTextElement(arrow, elementsMap);
  return boundText?.text || undefined;
};

export const buildOrgChartData = (
  elements: readonly ExcalidrawElement[],
  selectedElements: readonly ExcalidrawElement[],
): OrgChartData => {
  const nonDeleted = getNonDeletedElements(elements);
  const elementsMap = arrayToMap(nonDeleted);
  const selectedBindable = selectedElements.filter(isBindableElement);
  const nodes = (selectedBindable.length ? selectedBindable : nonDeleted).filter(
    isBindableElement,
  );

  const nodeIdByElementId = new Map<string, string>();
  const nodePayload = nodes.map((node) => {
    const orgData = getOrgChartData(node);
    const nodeId =
      orgData?.type === "node" && orgData.nodeId ? orgData.nodeId : node.id;
    nodeIdByElementId.set(node.id, nodeId);
    return {
      id: nodeId,
      name: getNodeName(node, elementsMap),
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      attributes:
        orgData?.type === "node" && orgData.attributes
          ? orgData.attributes
          : [],
    };
  });

  const nodeIds = new Set(nodePayload.map((node) => node.id));

  const relationships = nonDeleted
    .filter(isArrowElement)
    .map((arrow) => {
      const startId = arrow.startBinding?.elementId;
      const endId = arrow.endBinding?.elementId;
      if (!startId || !endId) {
        return null;
      }
      const fromId = nodeIdByElementId.get(startId);
      const toId = nodeIdByElementId.get(endId);
      if (!fromId || !toId) {
        return null;
      }
      if (!nodeIds.has(fromId) || !nodeIds.has(toId)) {
        return null;
      }
      const orgData = getOrgChartData(arrow);
      return {
        id:
          orgData?.type === "relationship" && orgData.relId
            ? orgData.relId
            : arrow.id,
        from: orgData?.type === "relationship" && orgData.from
          ? orgData.from
          : fromId,
        to: orgData?.type === "relationship" && orgData.to ? orgData.to : toId,
        label: getRelationshipLabel(arrow, elementsMap),
        cardinality:
          orgData?.type === "relationship" ? orgData.cardinality : undefined,
        attributes:
          orgData?.type === "relationship" && orgData.attributes
            ? orgData.attributes
            : [],
      };
    })
    .filter(
      (relationship): relationship is OrgChartData["relationships"][number] =>
        Boolean(relationship),
    );

  return {
    version: ORG_CHART_VERSION,
    nodes: nodePayload,
    relationships,
  };
};

const getCenterPoint = (
  element: ExcalidrawElement,
  elementsMap: Map<string, ExcalidrawElement>,
) => {
  const [x1, y1, x2, y2] = getElementBounds(element, elementsMap);
  return {
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
  };
};

const createBoundText = (
  container: ExcalidrawBindableElement,
  text: string,
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
  const metrics = measureText(text, font, lineHeight);

  const textElement: ExcalidrawTextElement = newTextElement({
    x: container.x + (container.width - metrics.width) / 2,
    y: container.y + (container.height - metrics.height) / 2,
    text,
    width: metrics.width,
    height: metrics.height,
    fontFamily: appState.currentItemFontFamily,
    fontSize: appState.currentItemFontSize,
    textAlign: TEXT_ALIGN.CENTER,
    verticalAlign: VERTICAL_ALIGN.MIDDLE,
    lineHeight,
    containerId: container.id,
    autoResize: true,
    strokeColor: container.strokeColor,
  });

  return textElement;
};

export const createOrgChartElements = (
  data: OrgChartData,
  appState: AppState,
  existingIds: Set<string> = new Set(),
) => {
  const elements: ExcalidrawElement[] = [];
  const elementByNodeId = new Map<string, ExcalidrawBindableElement>();
  const elementsMap = new Map<string, ExcalidrawElement>();
  const idMap = new Map<string, string>();

  const getUniqueId = (id: string) => {
    if (!existingIds.has(id) && !idMap.has(id)) {
      existingIds.add(id);
      return id;
    }
    const nextId = randomId();
    idMap.set(id, nextId);
    existingIds.add(nextId);
    return nextId;
  };

  data.nodes.forEach((node) => {
    const nodeId = getUniqueId(node.id);
    const nodeElement = newElement({
      id: nodeId,
      type: "rectangle",
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width ?? DEFAULT_NODE_WIDTH,
      height: node.height ?? DEFAULT_NODE_HEIGHT,
      strokeColor: appState.currentItemStrokeColor,
      backgroundColor: appState.currentItemBackgroundColor,
      fillStyle: appState.currentItemFillStyle,
      strokeWidth: appState.currentItemStrokeWidth,
      strokeStyle: appState.currentItemStrokeStyle,
      roughness: appState.currentItemRoughness,
      opacity: appState.currentItemOpacity,
      roundness: appState.currentItemRoundness,
      customData: {
        orgChart: {
          type: "node",
          nodeId,
          name: node.name,
          attributes: node.attributes ?? [],
        },
      },
    }) as ExcalidrawBindableElement;

    const textElement = node.name
      ? createBoundText(nodeElement, node.name, appState)
      : null;

    const nextNode = textElement
      ? newElementWith(nodeElement, {
          boundElements: [{ id: textElement.id, type: "text" }],
        })
      : nodeElement;

    elements.push(nextNode);
    elementsMap.set(nextNode.id, nextNode);
    elementByNodeId.set(node.id, nextNode);

    if (textElement) {
      elements.push(textElement);
      elementsMap.set(textElement.id, textElement);
    }
  });

  data.relationships.forEach((rel) => {
    const startElement = elementByNodeId.get(rel.from);
    const endElement = elementByNodeId.get(rel.to);
    if (!startElement || !endElement) {
      return;
    }

    const relId = getUniqueId(rel.id);
    const startCenter = getCenterPoint(startElement, elementsMap);
    const endCenter = getCenterPoint(endElement, elementsMap);

    const startPoint = pointFrom(startCenter.x, startCenter.y);
    const endPoint = pointFrom(endCenter.x, endCenter.y);

    const arrow = newArrowElement({
      id: relId,
      type: "arrow",
      x: startPoint[0],
      y: startPoint[1],
      points: [
        pointFrom(0, 0),
        pointFrom(endPoint[0] - startPoint[0], endPoint[1] - startPoint[1]),
      ],
      strokeColor: startElement.strokeColor,
      backgroundColor: DEFAULT_ELEMENT_PROPS.backgroundColor,
      fillStyle: DEFAULT_ELEMENT_PROPS.fillStyle,
      strokeWidth: startElement.strokeWidth,
      strokeStyle: startElement.strokeStyle,
      roughness: startElement.roughness,
      opacity: startElement.opacity,
      roundness: null,
      startArrowhead: null,
      endArrowhead: "arrow",
      elbowed: false,
      fixedSegments: null,
      customData: {
        orgChart: {
          type: "relationship",
          relId,
          from: idMap.get(rel.from) || rel.from,
          to: idMap.get(rel.to) || rel.to,
          label: rel.label,
          cardinality: rel.cardinality,
          attributes: rel.attributes ?? [],
        },
      },
    }) as NonDeleted<ExcalidrawArrowElement>;

    const bindingMap = arrayToMap([
      ...getNonDeletedElements(elements),
      arrow,
    ]);

    arrow.startBinding = {
      elementId: startElement.id,
      mode: "orbit",
      ...calculateFixedPointForNonElbowArrowBinding(
        arrow,
        startElement,
        "start",
        bindingMap,
        startPoint,
      ),
    };
    arrow.endBinding = {
      elementId: endElement.id,
      mode: "orbit",
      ...calculateFixedPointForNonElbowArrowBinding(
        arrow,
        endElement,
        "end",
        bindingMap,
        endPoint,
      ),
    };

    const updatedStartPoint = updateBoundPoint(
      arrow,
      "startBinding",
      arrow.startBinding,
      startElement,
      bindingMap,
    );
    const updatedEndPoint = updateBoundPoint(
      arrow,
      "endBinding",
      arrow.endBinding,
      endElement,
      bindingMap,
    );

    const updatedArrow = newElementWith(
      arrow,
      {
        points: [
          updatedStartPoint || arrow.points[0],
          updatedEndPoint || arrow.points[arrow.points.length - 1],
        ],
      },
      true,
    );

    const nextStart = newElementWith(startElement, {
      boundElements: (startElement.boundElements || []).concat({
        id: updatedArrow.id,
        type: "arrow",
      }),
    });
    const nextEnd = newElementWith(endElement, {
      boundElements: (endElement.boundElements || []).concat({
        id: updatedArrow.id,
        type: "arrow",
      }),
    });

    elementsMap.set(nextStart.id, nextStart);
    elementsMap.set(nextEnd.id, nextEnd);
    elementsMap.set(updatedArrow.id, updatedArrow);

    const replaceElements = (next: ExcalidrawElement) => {
      const index = elements.findIndex((element) => element.id === next.id);
      if (index === -1) {
        elements.push(next);
        return;
      }
      elements[index] = next;
    };

    replaceElements(nextStart);
    replaceElements(nextEnd);
    elements.push(updatedArrow);

    elementByNodeId.set(rel.from, nextStart);
    elementByNodeId.set(rel.to, nextEnd);
  });

  return getNonDeletedElements(elements);
};

export const getOrgChartBounds = (elements: readonly ExcalidrawElement[]) => {
  const nonDeleted = getNonDeletedElements(elements);
  if (!nonDeleted.length) {
    return null;
  }
  const elementsMap = arrayToMap(nonDeleted);
  return getCommonBounds(nonDeleted, elementsMap);
};
