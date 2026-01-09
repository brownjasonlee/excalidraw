import { randomId } from "@excalidraw/common";

import type {
  OrgChartAttribute,
  OrgChartData,
  OrgChartNode,
  OrgChartRelationship,
} from "./types";
import { ORG_CHART_VERSION } from "./types";

const normalizeHeader = (value: string) => value.trim().toLowerCase();

const splitLines = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

const parseDelimited = (text: string, delimiter: string) => {
  const lines = splitLines(text);
  const rows: string[][] = [];
  for (const line of lines) {
    const row: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === "\"") {
        if (inQuotes && line[i + 1] === "\"") {
          current += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current);
    rows.push(row.map((cell) => cell.trim()));
  }
  return rows;
};

const detectDelimiter = (text: string) => {
  const headerLine = splitLines(text)[0] || "";
  return headerLine.includes("\t") ? "\t" : ",";
};

const parseAttributeCell = (name: string, raw: string): OrgChartAttribute => {
  const value = raw.trim();
  const colorMatch = /^(.*)#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value);
  if (colorMatch) {
    const [, rawValue, color] = colorMatch;
    return {
      id: randomId(),
      name,
      value: rawValue.trim() || undefined,
      color: `#${color}`,
      display: "label",
    };
  }
  return {
    id: randomId(),
    name,
    value: value || undefined,
    display: "label",
  };
};

const splitParents = (raw: string) => {
  if (!raw) {
    return [];
  }
  return raw
    .split(/[|,;]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export const parseOrgChartCSV = (text: string): OrgChartData => {
  const delimiter = detectDelimiter(text);
  const rows = parseDelimited(text, delimiter);
  if (!rows.length) {
    return { version: ORG_CHART_VERSION, nodes: [], relationships: [] };
  }
  const headers = rows[0].map(normalizeHeader);
  const headerIndex = new Map(headers.map((name, index) => [name, index]));
  const idIndex = headerIndex.get("id");
  const nameIndex = headerIndex.get("name");
  const parentIndex = headerIndex.get("parent");

  if (idIndex == null || nameIndex == null || parentIndex == null) {
    throw new Error("Missing required columns: id, name, parent");
  }

  const attributeHeaders = headers.filter(
    (header) => !["id", "name", "parent"].includes(header),
  );
  const nodes: OrgChartNode[] = [];
  const relationships: OrgChartRelationship[] = [];
  const seenIds = new Set<string>();
  const usedRelationshipIds = new Set<string>();

  rows.slice(1).forEach((row) => {
    const rawId = row[idIndex]?.trim();
    if (!rawId) {
      return;
    }
    const id = rawId;
    const name = row[nameIndex]?.trim() || id;
    const parentRaw = row[parentIndex]?.trim();

    const attributes = attributeHeaders
      .map((header) => {
        const value = row[headerIndex.get(header) ?? -1] || "";
        if (!value.trim()) {
          return null;
        }
        return parseAttributeCell(header, value);
      })
      .filter(Boolean) as OrgChartAttribute[];

    nodes.push({
      id,
      name,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      attributes,
    });
    seenIds.add(id);

    const parents = splitParents(parentRaw || "");
    parents.forEach((parentId) => {
      if (!parentId || parentId === id) {
        return;
      }
      const relKey = `${parentId}->${id}`;
      const relId = usedRelationshipIds.has(relKey) ? randomId() : relKey;
      usedRelationshipIds.add(relId);
      relationships.push({
        id: relId,
        from: parentId,
        to: id,
      });
    });
  });

  return {
    version: ORG_CHART_VERSION,
    nodes,
    relationships,
  };
};

const escapeCsvValue = (value: string) => {
  if (value.includes("\"")) {
    value = value.replace(/\"/g, "\"\"");
  }
  if (/[,\n\r\t]/.test(value)) {
    return `"${value}"`;
  }
  return value;
};

export const serializeOrgChartCSV = (data: OrgChartData) => {
  const incoming = new Map<string, string[]>();
  data.relationships.forEach((rel) => {
    const list = incoming.get(rel.to) || [];
    list.push(rel.from);
    incoming.set(rel.to, list);
  });

  const attributeNames = new Set<string>();
  data.nodes.forEach((node) => {
    node.attributes?.forEach((attr) => {
      if (attr.name) {
        attributeNames.add(attr.name);
      }
    });
  });

  const headers = ["id", "name", "parent", ...Array.from(attributeNames)];
  const rows = [headers.join(",")];

  data.nodes.forEach((node) => {
    const parents = incoming.get(node.id) || [];
    const parentValue = parents.join(",");
    const attributes = new Map(
      (node.attributes || [])
        .filter((attr) => attr.name)
        .map((attr) => [
          attr.name,
          attr.color ? `${attr.value || ""}#${attr.color.replace("#", "")}` : attr.value || "",
        ]),
    );

    const row = [
      node.id,
      node.name,
      parentValue,
      ...Array.from(attributeNames).map((name) => attributes.get(name) || ""),
    ]
      .map((value) => escapeCsvValue(value || ""))
      .join(",");
    rows.push(row);
  });

  return rows.join("\n");
};
