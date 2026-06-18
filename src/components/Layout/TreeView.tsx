"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "../Icon";
import styles from "./TreeView.module.css";

export interface TreeNode {
  id: string;
  label: ReactNode;
  icon?: IconName;
  children?: TreeNode[];
}

export interface TreeViewProps {
  nodes: TreeNode[];
  defaultExpanded?: string[];
  defaultSelected?: string;
}

/** File/scene tree (board: Tree view — World / Northern Realm / …). Expand /
    collapse with persistent selection. */
export function TreeView({
  nodes,
  defaultExpanded = [],
  defaultSelected,
}: TreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(defaultExpanded)
  );
  const [selected, setSelected] = useState(defaultSelected);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function render(node: TreeNode, depth: number): ReactNode {
    const hasChildren = !!node.children?.length;
    const isOpen = expanded.has(node.id);
    const isSelected = selected === node.id;
    return (
      <li
        key={node.id}
        role="treeitem"
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-selected={isSelected}
      >
        <div
          className={styles.row}
          data-state={isSelected ? "selected" : undefined}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            setSelected(node.id);
            if (hasChildren) toggle(node.id);
          }}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSelected(node.id);
              if (hasChildren) toggle(node.id);
            }
          }}
        >
          <span className={cx(styles.caret, !hasChildren && styles.caretHidden)}>
            <Icon
              name="chevronRight"
              size={14}
              className={cx(styles.caretIcon, isOpen && styles.caretOpen)}
            />
          </span>
          <span className={styles.icon}>
            <Icon
              name={node.icon ?? (hasChildren ? "folder" : "box")}
              size={15}
            />
          </span>
          <span className={styles.label}>{node.label}</span>
        </div>
        {hasChildren && isOpen && (
          <ul role="group" className={styles.group}>
            {node.children!.map((c) => render(c, depth + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <ul role="tree" className={styles.tree}>
      {nodes.map((n) => render(n, 0))}
    </ul>
  );
}
