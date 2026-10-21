import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ObjectType } from "../data/constants";
import {
  findTableByRef,
  readTableLink,
  transformForTable,
} from "../utils/deepLink";
import { getTableHeight, getTableWidth } from "../utils/utils";
import useDiagram from "./useDiagram";
import useSelect from "./useSelect";
import useSettings from "./useSettings";
import useTransform from "./useTransform";

export default function useTableDeepLink() {
  const { search, hash, pathname } = useLocation();
  const { tables, relationships } = useDiagram();
  const { setTransform } = useTransform();
  const { setSelectedElement } = useSelect();
  const { settings } = useSettings();
  const appliedRef = useRef(null);

  useEffect(() => {
    const link = readTableLink(search, hash);
    if (!link) return;

    const key = `${pathname}|${link.table}`;
    if (appliedRef.current === key) return;

    const table = findTableByRef(tables, link.table);
    const canvas = document.getElementById("canvas");
    if (!table || !canvas) return;

    appliedRef.current = key;
    setTransform(
      transformForTable(
        {
          x: table.x,
          y: table.y,
          width: getTableWidth(table),
          height: getTableHeight(table, settings.showComments, relationships),
        },
        canvas.getBoundingClientRect(),
      ),
    );
    setSelectedElement((prev) => ({
      ...prev,
      element: ObjectType.TABLE,
      id: table.id,
      open: false,
    }));
  }, [
    search,
    hash,
    pathname,
    tables,
    relationships,
    settings.showComments,
    setTransform,
    setSelectedElement,
  ]);
}
