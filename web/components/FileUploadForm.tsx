import { useState } from "react";
import { FileWithStatus, UploadResponse, API_BASE_URL } from "@/types";
import FileDropzone from "./FileDropzone";

interface FileUploadFormProps {
  dossierId?: string;
  onUploadComplete?: (response: UploadResponse) => void;
}

export default function FileUploadForm({
  dossierId,
  onUploadComplete,
}: FileUploadFormProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFilesAdded = (newFiles: File[]) => {
    const filesWithStatus: FileWithStatus[] = newFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substring(7),
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...filesWithStatus]);
    setUploadError(null);
  };

  const handleFileRemove = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setUploadError("Te rog să adaugi cel puțin un fișier");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Marchează toate fișierele ca fiind în upload
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: "uploading" as const }))
      );

      const formData = new FormData();
      files.forEach((fileWithStatus) => {
        formData.append("files", fileWithStatus.file);
      });

      if (dossierId) {
        formData.append("dossier_id", dossierId);
      }

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data: UploadResponse = await response.json();

      if (data.success) {
        // Marchează toate fișierele ca validate
        setFiles((prev) =>
          prev.map((f) => ({ ...f, status: "validated" as const }))
        );
        
        if (onUploadComplete) {
          onUploadComplete(data);
        }
      } else {
        // Marchează fișierele cu eroare
        const errorMessage = data.error || "Eroare la încărcare";
        setFiles((prev) =>
          prev.map((f) => ({
            ...f,
            status: "error" as const,
            errorMessage,
          }))
        );
        setUploadError(errorMessage);
      }
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = "A apărut o eroare la încărcarea fișierelor. Te rog să încerci din nou.";
      setUploadError(errorMessage);
      
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: "error" as const,
          errorMessage,
        }))
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <FileDropzone
        files={files}
        onFilesAdded={handleFilesAdded}
        onFileRemove={handleFileRemove}
      />

      {uploadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="text-sm font-semibold text-red-900">
                Eroare la încărcare
              </h4>
              <p className="text-sm text-red-700 mt-1">{uploadError}</p>
            </div>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isUploading}
            className="rounded-lg bg-purple-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isUploading ? "Se încarcă..." : "Trimite dosarul"}
          </button>
        </div>
      )}
    </div>
  );
}
