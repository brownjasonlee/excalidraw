export const ORG_CHART_VERSION = 1 as const;

export type OrgChartAttributeDisplay = "label" | "badge" | "hidden";

export type OrgChartAttribute = {
  id: string;
  name: string;
  value?: string;
  color?: string;
  display?: OrgChartAttributeDisplay;
};

export type OrgChartNode = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  attributes?: OrgChartAttribute[];
};

export type OrgChartRelationship = {
  id: string;
  from: string;
  to: string;
  label?: string;
  cardinality?: string;
  attributes?: OrgChartAttribute[];
};

export type OrgChartData = {
  version: typeof ORG_CHART_VERSION;
  nodes: OrgChartNode[];
  relationships: OrgChartRelationship[];
};

export type OrgChartElementData =
  | {
      type: "node";
      nodeId: string;
      name: string;
      attributes?: OrgChartAttribute[];
    }
  | {
      type: "relationship";
      relId: string;
      from: string;
      to: string;
      label?: string;
      cardinality?: string;
      attributes?: OrgChartAttribute[];
    };

export const isOrgChartData = (data: any): data is OrgChartData => {
  return (
    data?.version === ORG_CHART_VERSION &&
    Array.isArray(data?.nodes) &&
    Array.isArray(data?.relationships)
  );
};
