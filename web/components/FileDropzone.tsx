import { useCallback, useState } from "react";
import { FileWithStatus } from "@/types";

interface FileDropzoneProps {
  files: FileWithStatus[];
  onFilesAdded: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
  accept?: string;
  maxFiles?: number;
}

export default function FileDropzone({
  files,
  onFilesAdded,
  onFileRemove,
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  maxFiles = 10,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (files.length + droppedFiles.length <= maxFiles) {
        onFilesAdded(droppedFiles);
      } else {
        alert(`Poți încărca maxim ${maxFiles} fișiere`);
      }
    },
    [files.length, maxFiles, onFilesAdded]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        if (files.length + selectedFiles.length <= maxFiles) {
          onFilesAdded(selectedFiles);
        } else {
          alert(`Poți încărca maxim ${maxFiles} fișiere`);
        }
      }
    },
    [files.length, maxFiles, onFilesAdded]
  );

  const getStatusIcon = (status: FileWithStatus["status"]) => {
    switch (status) {
      case "uploading":
        return "⏳";
      case "validated":
        return "✅";
      case "error":
        return "❌";
      default:
        return "📄";
    }
  };

  const getStatusColor = (status: FileWithStatus["status"]) => {
    switch (status) {
      case "uploading":
        return "text-blue-600";
      case "validated":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="w-full">
      {/* Dropzone Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? "border-purple-500 bg-purple-50"
            : "border-purple-200 bg-purple-50/30 hover:border-purple-300"
        }`}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="text-5xl">📁</div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              Trage documentele aici sau
            </p>
            <label
              htmlFor="file-upload"
              className="mt-2 inline-block cursor-pointer rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            >
              Selectează fișiere
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Formate acceptate: PDF, JPG, PNG, DOC, DOCX (max {maxFiles} fișiere)
          </p>
        </div>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Fișiere selectate ({files.length})
          </h3>
          {files.map((fileWithStatus) => (
            <div
              key={fileWithStatus.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className={`text-2xl ${getStatusColor(fileWithStatus.status)}`}>
                  {getStatusIcon(fileWithStatus.status)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileWithStatus.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(fileWithStatus.file.size)}
                  </p>
                  {fileWithStatus.errorMessage && (
                    <p className="text-xs text-red-600 mt-1">
                      {fileWithStatus.errorMessage}
                    </p>
                  )}
                </div>
              </div>
              
              {fileWithStatus.status !== "uploading" && (
                <button
                  onClick={() => onFileRemove(fileWithStatus.id)}
                  className="ml-4 text-gray-400 hover:text-red-600 transition-colors"
                  title="Șterge fișier"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
