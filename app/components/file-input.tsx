"use client";

import { useRef, useState } from "react";

type FileInputProps = {
  accept: string;
  name: string;
};

export function FileInput({ accept, name }: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  function clearFile() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setFileName("");
  }

  return (
    <div className="file-input-row">
      <input
        accept={accept}
        name={name}
        onChange={(event) => setFileName(event.target.files?.[0]?.name || "")}
        ref={inputRef}
        type="file"
      />
      {fileName ? (
        <button className="danger-button action-button file-clear-button" onClick={clearFile} type="button">
          Remove file
        </button>
      ) : null}
    </div>
  );
}
