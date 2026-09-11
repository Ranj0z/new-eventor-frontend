import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { TUploadFolder } from "../../reducers/uploads/uploadsAPI";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

type ImageUploadFieldProps = {
  label: string;
  value: string | null; // existing (already-uploaded) image url, if any
  onFileSelect: (file: File | null) => void;
  folder: TUploadFolder;
};

// Dumb picker only: validates and previews locally, then hands the raw
// File up via onFileSelect. It does NOT call uploadImage — the owning
// form uploads on submit (see eventor-image-uploads-summary.md, "upload
// happens only when the form is actually saved"). `folder` is kept as a
// prop so the parent's submit handler and this field agree on where the
// eventual upload call will send the file.
export default function ImageUploadField({ label, value, onFileSelect }: ImageUploadFieldProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke the object URL when it's replaced or the component unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
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

    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    onFileSelect(file);
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
        />
      </div>
      {localError && <p className="text-error text-xs mt-1">{localError}</p>}
    </label>
  );
}
