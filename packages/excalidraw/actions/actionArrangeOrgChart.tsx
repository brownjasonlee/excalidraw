import { arrayToMap } from "@excalidraw/common";

import {
  getCommonBounds,
  getNonDeletedElements,
  isArrowElement,
  isBindableElement,
  CaptureUpdateAction,
  updateBoundElements,
  updateFrameMembershipOfSelectedElements,
} from "@excalidraw/element";

import type { ExcalidrawBindableElement } from "@excalidraw/element/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";

import { ToolButton } from "../components/ToolButton";
import { gridIcon } from "../components/icons";
import { t } from "../i18n";
import { isSomeElementSelected } from "../scene";

import { register } from "./register";

import type { AppClassProperties, AppState } from "../types";

const ORG_ROW_GAP = 80;
const ORG_COLUMN_GAP = 40;

const getSelectedBindableElements = (
  app: AppClassProperties,
  appState: AppState,
) => {
  const selectedElements = app.scene.getSelectedElements({
    selectedElementIds: appState.selectedElementIds,
    includeBoundTextElement: true,
  });

  return selectedElements.filter(isBindableElement);
};

const buildDepthMap = (
  elements: ExcalidrawBindableElement[],
  allElements: readonly ExcalidrawElement[],
) => {
  const selectedIds = new Set(elements.map((element) => element.id));
  const outgoing = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();

  for (const element of allElements) {
    if (!isArrowElement(element)) {
      continue;
    }
    const startId = element.startBinding?.elementId;
    const endId = element.endBinding?.elementId;
    if (!startId || !endId) {
      continue;
    }
    if (!selectedIds.has(startId) || !selectedIds.has(endId)) {
      continue;
    }
    const next = outgoing.get(startId) || [];
    next.push(endId);
    outgoing.set(startId, next);
    incomingCount.set(endId, (incomingCount.get(endId) || 0) + 1);
  }

  const depthById = new Map<string, number>();
  const roots = elements.filter(
    (element) => !incomingCount.has(element.id),
  );

  if (roots.length === 0) {
    elements.forEach((element) => depthById.set(element.id, 0));
    return depthById;
  }

  const queue: Array<{ id: string; depth: number }> = roots.map((element) => ({
    id: element.id,
    depth: 0,
  }));
  roots.forEach((element) => depthById.set(element.id, 0));

  while (queue.length) {
    const current = queue.shift()!;
    const children = outgoing.get(current.id) || [];
    for (const childId of children) {
      const nextDepth = current.depth + 1;
      const existingDepth = depthById.get(childId);
      if (existingDepth == null || nextDepth < existingDepth) {
        depthById.set(childId, nextDepth);
        queue.push({ id: childId, depth: nextDepth });
      }
    }
  }

  elements.forEach((element) => {
    if (!depthById.has(element.id)) {
      depthById.set(element.id, 0);
    }
  });

  return depthById;
};

const arrangeSelectedElements = (
  elements: readonly ExcalidrawElement[],
  appState: Readonly<AppState>,
  app: AppClassProperties,
) => {
  const selectedElements = getSelectedBindableElements(app, appState);
  if (selectedElements.length < 2) {
    return null;
  }

  const elementsMap = arrayToMap(elements);
  const [minX, minY, maxX, maxY] = getCommonBounds(
    selectedElements,
    elementsMap,
  );
  const centerX = (minX + maxX) / 2;

  const depthById = buildDepthMap(
    selectedElements,
    getNonDeletedElements(elements),
  );

  const rows = new Map<number, ExcalidrawBindableElement[]>();
  for (const element of selectedElements) {
    const depth = depthById.get(element.id) ?? 0;
    const bucket = rows.get(depth) || [];
    bucket.push(element);
    rows.set(depth, bucket);
  }

  const sortedDepths = Array.from(rows.keys()).sort((a, b) => a - b);
  let currentY = minY;
  const nextPositions = new Map<string, { x: number; y: number }>();

  for (const depth of sortedDepths) {
    const rowElements = rows.get(depth) || [];
    rowElements.sort((a, b) => a.x - b.x);
    const rowHeight = Math.max(...rowElements.map((element) => element.height));
    const rowWidth =
      rowElements.reduce((sum, element) => sum + element.width, 0) +
      ORG_COLUMN_GAP * Math.max(0, rowElements.length - 1);
    let currentX = centerX - rowWidth / 2;

    for (const element of rowElements) {
      nextPositions.set(element.id, {
        x: currentX,
        y: currentY + (rowHeight - element.height) / 2,
      });
      currentX += element.width + ORG_COLUMN_GAP;
    }

    currentY += rowHeight + ORG_ROW_GAP;
  }

  const updatedElements = selectedElements.map((element) => {
    const next = nextPositions.get(element.id);
    if (!next) {
      return element;
    }
    return app.scene.mutateElement(element, {
      x: next.x,
      y: next.y,
    });
  });

  updatedElements.forEach((element) => {
    updateBoundElements(element, app.scene, {
      simultaneouslyUpdated: updatedElements,
    });
  });

  const updatedElementsMap = arrayToMap(updatedElements);

  return updateFrameMembershipOfSelectedElements(
    elements.map((element) => updatedElementsMap.get(element.id) || element),
    appState,
    app,
  );
};

export const actionArrangeOrgChart = register({
  name: "arrangeOrgChart",
  label: "labels.arrangeOrgChart",
  icon: gridIcon,
  predicate: (_, appState, __, app) =>
    getSelectedBindableElements(app, appState).length > 1,
  perform: (elements, appState, _, app) => {
    const nextElements = arrangeSelectedElements(elements, appState, app);
    if (!nextElements) {
      return false;
    }

    return {
      elements: nextElements,
      appState,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  PanelComponent: ({ elements, appState, updateData, app }) => (
    <ToolButton
      hidden={getSelectedBindableElements(app, appState).length < 2}
      type="button"
      icon={gridIcon}
      onClick={() => updateData(null)}
      title={t("labels.arrangeOrgChart")}
      aria-label={t("labels.arrangeOrgChart")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    />
  ),
});
