import type { OrgChartAttribute, OrgChartElementData } from "./types";

const normalizeAttributes = (attributes?: OrgChartAttribute[]) => {
  if (!attributes || !attributes.length) {
    return [];
  }
  return attributes.filter(Boolean);
};

export const getOrgChartNodeLabelText = (
  data: OrgChartElementData | null,
) => {
  if (!data || data.type !== "node") {
    return "";
  }
  const attributes = normalizeAttributes(data.attributes).filter((attr) => {
    const display = attr.display ?? "label";
    return display === "label";
  });

  if (!attributes.length) {
    return data.name || "";
  }

  const lines = [data.name || ""] as string[];
  attributes.forEach((attr) => {
    const name = attr.name?.trim();
    if (!name) {
      return;
    }
    const value = attr.value?.trim();
    lines.push(value ? `${name}: ${value}` : name);
  });
  return lines.filter(Boolean).join("\n");
};
