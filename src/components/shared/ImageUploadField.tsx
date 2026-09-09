import { useRef, useState, type ChangeEvent } from "react";
import { useUploadImageMutation } from "../../reducers/uploads/uploadsAPI";
import type { TUploadFolder } from "../../reducers/uploads/uploadsAPI";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

type ImageUploadFieldProps = {
  label: string;
  value: string | null;
  onChange: (url: string) => void;
  folder: TUploadFolder;
};

// Uploads immediately on file select (see eventor-image-uploads-summary.md).
// Validation here mirrors the backend's allowlist/size cap for fast
// feedback only — the backend still enforces both; this is UX, not the
// trust boundary.
export default function ImageUploadField({ label, value, onChange, folder }: ImageUploadFieldProps) {
  const [uploadImage, { isLoading }] = useUploadImageMutation();
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setLocalError("Only JPEG, PNG, or WEBP images are allowed.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("Image must be 5MB or smaller.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      const { url } = await uploadImage({ file, folder }).unwrap();
      onChange(url);
    } catch {
      setLocalError("Upload failed. Try again.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const displayImage = preview ?? value ?? null;

  return (
    <label className="text-sm block">
      {label}
      <div className="flex items-center gap-3 mt-1">
        {displayImage && (
          <img src={displayImage} alt="" className="w-14 h-14 rounded object-cover border border-base-300" />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="file-input file-input-bordered w-full"
          onChange={handleFile}
          disabled={isLoading}
        />
      </div>
      {isLoading && <p className="text-xs opacity-60 mt-1">Uploading...</p>}
      {localError && <p className="text-error text-xs mt-1">{localError}</p>}
    </label>
  );
}
