"use client";

import { useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "../Icon";
import styles from "./FileUpload.module.css";

export interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  hint?: string;
  onFiles?: (files: File[]) => void;
}

/** Drag-and-drop file zone with explicit droppable / dragging states
    (board: File Upload; spec §2.1 dragging/droppable feedback). */
export function FileUpload({
  accept,
  multiple = false,
  hint = "PNG, JPG, GLB up to 10MB",
  onFiles,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list);
    setFiles(arr);
    onFiles?.(arr);
  }

  return (
    <div
      className={cx(styles.zone, dragging && styles.dragging)}
      data-state={dragging ? "droppable" : undefined}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && inputRef.current?.click()
      }
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className={styles.hidden}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <span className={styles.icon}>
        <Icon name="upload" size={22} />
      </span>
      {files.length > 0 ? (
        <p className={styles.primary}>
          {files.length === 1 ? files[0].name : `${files.length} files selected`}
        </p>
      ) : (
        <p className={styles.primary}>
          <strong>Click to upload</strong> or drag &amp; drop
        </p>
      )}
      <p className={styles.hint}>{hint}</p>
    </div>
  );
}
