import { arrayToMap } from "@excalidraw/common";
import { pointFrom } from "@excalidraw/math";

import {
  calculateFixedPointForNonElbowArrowBinding,
  CaptureUpdateAction,
  getCommonBounds,
  getNonDeletedElements,
  getSelectionStateForElements,
  hasBoundTextElement,
  isBindableElement,
  newArrowElement,
  newElement,
  syncMovedIndices,
  updateBoundPoint,
} from "@excalidraw/element";

import { newElementWith } from "@excalidraw/element";

import type {
  ExcalidrawBindableElement,
  ExcalidrawElement,
  ExcalidrawGenericElement,
  NonDeleted,
} from "@excalidraw/element/types";

import { ToolButton } from "../components/ToolButton";
import { PlusIcon } from "../components/icons";
import { t } from "../i18n";
import { isSomeElementSelected } from "../scene";

import { register } from "./register";

import type { AppClassProperties, AppState } from "../types";

const CHILD_MIN_WIDTH = 120;
const CHILD_MIN_HEIGHT = 60;
const CHILD_VERTICAL_GAP = 80;

const getAddChildParent = (
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

const getChildType = (
  parent: ExcalidrawBindableElement,
): ExcalidrawGenericElement["type"] => {
  if (
    parent.type === "rectangle" ||
    parent.type === "diamond" ||
    parent.type === "ellipse"
  ) {
    return parent.type;
  }

  return "rectangle";
};

const addBoundArrow = (
  element: NonDeleted<ExcalidrawElement>,
  arrowId: string,
) => {
  const boundElements = element.boundElements || [];
  if (boundElements.some((bound) => bound.id === arrowId)) {
    return boundElements;
  }

  return boundElements.concat({ id: arrowId, type: "arrow" });
};

export const actionAddChild = register({
  name: "addChild",
  label: "labels.addChild",
  icon: PlusIcon,
  perform: (elements, appState, _, app) => {
    if (appState.viewModeEnabled || appState.editingTextElement) {
      return false;
    }

    const parent = getAddChildParent(app, appState);
    if (!parent) {
      return false;
    }

    const elementsMap = arrayToMap(elements);
    const [x1, y1, x2, y2] = getCommonBounds([parent], elementsMap);
    const parentWidth = Math.max(1, x2 - x1);
    const parentHeight = Math.max(1, y2 - y1);
    const parentCenterX = x1 + parentWidth / 2;

    const childWidth = Math.max(CHILD_MIN_WIDTH, parentWidth);
    const childHeight = Math.max(CHILD_MIN_HEIGHT, parentHeight);
    const childX = parentCenterX - childWidth / 2;
    const childY = y2 + CHILD_VERTICAL_GAP;

    const childType = getChildType(parent);

    const child = newElement({
      type: childType,
      x: childX,
      y: childY,
      width: childWidth,
      height: childHeight,
      angle: parent.angle,
      strokeColor: parent.strokeColor,
      backgroundColor: parent.backgroundColor,
      fillStyle: parent.fillStyle,
      strokeWidth: parent.strokeWidth,
      strokeStyle: parent.strokeStyle,
      roughness: parent.roughness,
      opacity: parent.opacity,
      roundness: parent.roundness,
      locked: false,
      frameId: parent.frameId ?? null,
    });

    const childCenterX = childX + childWidth / 2;
    const startFocusPoint = pointFrom(parentCenterX, y2);
    const endFocusPoint = pointFrom(childCenterX, childY);

    const arrow = newArrowElement({
      type: "arrow",
      x: startFocusPoint[0],
      y: startFocusPoint[1],
      points: [
        pointFrom(0, 0),
        pointFrom(
          endFocusPoint[0] - startFocusPoint[0],
          endFocusPoint[1] - startFocusPoint[1],
        ),
      ],
      strokeColor: parent.strokeColor,
      backgroundColor: parent.backgroundColor,
      fillStyle: parent.fillStyle,
      strokeWidth: parent.strokeWidth,
      strokeStyle: parent.strokeStyle,
      roughness: parent.roughness,
      opacity: parent.opacity,
      roundness: null,
      startArrowhead: null,
      endArrowhead: "arrow",
      locked: false,
      frameId: parent.frameId ?? null,
      elbowed: false,
      fixedSegments: null,
    });

    const bindingElementsMap = arrayToMap([...elements, child, arrow]);
    arrow.startBinding = {
      elementId: parent.id,
      mode: "orbit",
      ...calculateFixedPointForNonElbowArrowBinding(
        arrow,
        parent,
        "start",
        bindingElementsMap,
        startFocusPoint,
      ),
    };
    arrow.endBinding = {
      elementId: child.id,
      mode: "orbit",
      ...calculateFixedPointForNonElbowArrowBinding(
        arrow,
        child,
        "end",
        bindingElementsMap,
        endFocusPoint,
      ),
    };

    const startPoint = updateBoundPoint(
      arrow,
      "startBinding",
      arrow.startBinding,
      parent,
      bindingElementsMap,
    );
    const endPoint = updateBoundPoint(
      arrow,
      "endBinding",
      arrow.endBinding,
      child,
      bindingElementsMap,
    );

    const nextArrow = newElementWith(
      arrow,
      {
        points: [
          startPoint || arrow.points[0],
          endPoint || arrow.points[arrow.points.length - 1],
        ],
      },
      true,
    );

    const nextParent = newElementWith(parent, {
      boundElements: addBoundArrow(parent, nextArrow.id),
    });
    const nextChild = newElementWith(child, {
      boundElements: addBoundArrow(child, nextArrow.id),
    });

    const nextElements = elements.map((element) =>
      element.id === nextParent.id ? nextParent : element,
    );
    const elementsWithChild = [...nextElements, nextChild, nextArrow];
    const orderedElements = syncMovedIndices(
      elementsWithChild,
      arrayToMap([nextChild, nextArrow]),
    );

    return {
      elements: orderedElements,
      appState: {
        ...appState,
        ...getSelectionStateForElements(
          [nextChild],
          getNonDeletedElements(orderedElements),
          appState,
        ),
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  predicate: (_, appState, __, app) =>
    Boolean(getAddChildParent(app, appState)),
  PanelComponent: ({ elements, appState, updateData, app }) => {
    const canAddChild = Boolean(getAddChildParent(app, appState));

    return (
      <ToolButton
        hidden={!canAddChild}
        type="button"
        icon={PlusIcon}
        onClick={() => updateData(null)}
        title={t("labels.addChild")}
        aria-label={t("labels.addChild")}
        visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
      />
    );
  },
});
