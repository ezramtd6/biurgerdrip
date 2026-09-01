"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Modal } from "@/components/ui";
import { apiErrorMessage } from "@/lib/utils";

interface BulkExcelImportProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  endpoint: string;
  templateUrl: string;
  columns: string[];
  example?: string[];
  invalidateKeys: string[][];
  onImported?: (ids: number[]) => void;
}

export default function BulkExcelImport({
  isOpen,
  onClose,
  title,
  endpoint,
  templateUrl,
  columns,
  example,
  invalidateKeys,
  onImported,
}: BulkExcelImportProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const isXlsx = (f: File) =>
    f.name.toLowerCase().endsWith(".xlsx") || f.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const defaultFileName = () => {
    const raw = templateUrl.split("?")[0].replace(/\/+$/, "").split("/").pop() || "";
    const base = raw.toLowerCase().includes("category") ? "categories" : "products";
    return `${base}.xlsx`;
  };

  const downloadTemplate = async () => {
    setDownloading(true);
    setGlobalError(null);
    try {
      const res = await api.get(templateUrl, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const disposition = res.headers["content-disposition"] || "";
      const match = /filename="?([^";]+)"?/.exec(disposition);
      a.download = match ? decodeURIComponent(match[1]) : defaultFileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setGlobalError("Failed to download the sample file. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        setFileError("Please choose an Excel (.xlsx) file first.");
        throw new Error("NO_FILE");
      }
      if (!isXlsx(file)) {
        setFileError("Only .xlsx Excel files are supported.");
        throw new Error("BAD_FILE");
      }
      setFileError(null);
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post(endpoint, fd, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data as { created: number; ids: number[]; errors: string[] };
    },
    onSuccess: (data) => {
      setResult(data);
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      if (onImported && data.ids && data.ids.length > 0 && (!data.errors || data.errors.length === 0)) {
        close();
        onImported(data.ids);
      }
    },
    onError: (e: unknown) => {
      if (e instanceof Error && (e.message === "NO_FILE" || e.message === "BAD_FILE")) return;
      setGlobalError(apiErrorMessage(e, "Import failed"));
    },
  });

  const reset = () => {
    setFile(null);
    setFileError(null);
    setResult(null);
    setGlobalError(null);
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title={title} maxWidth="lg">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Download the sample Excel file, fill it in, then re-upload it here. The first row must contain the column
            headers below.
          </p>
          <div className="mb-3">
            <Button variant="secondary" size="sm" type="button" loading={downloading} onClick={downloadTemplate}>
              <i className="fas fa-download mr-2"></i>Download Sample Excel
            </Button>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-xs">
            <p className="font-semibold text-gray-700 mb-1">Expected columns (header row):</p>
            <p className="text-gray-600 font-mono">
              {columns.map((c) => (
                <span key={c} className="inline-block bg-white border border-gray-200 rounded px-1.5 py-0.5 mr-1 mb-1">
                  {c}
                </span>
              ))}
            </p>
            {example && (
              <>
                <p className="font-semibold text-gray-700 mt-2 mb-1">Example row:</p>
                <p className="text-gray-600 font-mono">{example.join(" | ")}</p>
              </>
            )}
          </div>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                setResult(null);
                setGlobalError(null);
                setFileError(null);
              }
            }}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) {
                setFile(f);
                setResult(null);
                setGlobalError(null);
                setFileError(null);
              }
            }}
            className={`w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-orange-400"
            }`}
          >
            {file ? (
              <span className="text-sm text-gray-700">
                <i className="fas fa-file-excel text-green-600 mr-2"></i>
                {file.name}
              </span>
            ) : (
              <span className="text-sm text-gray-500">
                <i className="fas fa-cloud-upload-alt text-gray-400 mr-2"></i>
                Drag &amp; drop your Excel file here, or click to browse
              </span>
            )}
          </div>
          {fileError && <p className="mt-1 text-sm text-red-500">{fileError}</p>}
        </div>

        {globalError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
            {globalError}
          </div>
        )}

        {result && (
          <div className="rounded-lg px-3 py-2 text-sm border">
            <div className="font-semibold text-green-700">
              Imported {result.created} {title.toLowerCase()}
              {result.errors.length > 0 ? " — the whole file was rolled back due to errors." : " successfully."}
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-red-600 text-xs">
                    {err}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" type="button" onClick={close}>
            {result ? "Done" : "Cancel"}
          </Button>
          {!result && (
            <Button type="button" loading={mutation.isPending} onClick={() => mutation.mutate()}>
              Import
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
