import { useState, type FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import { useUpdateUserMutation } from "../../reducers/users/usersAPI";
import { useUploadImageMutation } from "../../reducers/uploads/uploadsAPI";
import { loginSuccess } from "../../reducers/login/userSlice";
import ImageUploadField from "./ImageUploadField";

// Same fields for admin, host and user — role/verification aren't editable
// here, that's an admin-only action on UserModal. Never touches password or
// verification_code. See eventor-build-spec.md §8.
export default function ProfileForm() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.user);
  const [updateUser, { isLoading: isSaving, error }] = useUpdateUserMutation();
  const [uploadImage, { isLoading: isUploading }] = useUploadImageMutation();
  const [saved, setSaved] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phoneNumber: user?.phoneNumber ?? "",
    address: user?.address ?? "",
  });

  const isLoading = isSaving || isUploading;

  if (!user || !token) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setUploadError(false);

    let imagePatch: { image_url: string; image_public_id: string } | Record<string, never> = {};
    if (pendingFile) {
      try {
        const { url, public_id } = await uploadImage({ file: pendingFile, folder: "profile" }).unwrap();
        imagePatch = { image_url: url, image_public_id: public_id };
      } catch {
        setUploadError(true);
        return;
      }
    }

    try {
      const updated = await updateUser({ id: user.UserID, ...form, ...imagePatch }).unwrap();
      dispatch(loginSuccess({ token, user: updated }));
      setPendingFile(null);
      setSaved(true);
    } catch {
      // error surfaced below
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          First name
          <input
            className="input input-bordered w-full mt-1"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
        </label>
        <label className="text-sm">
          Last name
          <input
            className="input input-bordered w-full mt-1"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
        </label>
      </div>

      <label className="text-sm block">
        Phone number
        <input
          className="input input-bordered w-full mt-1"
          value={form.phoneNumber}
          onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
        />
      </label>

      <label className="text-sm block">
        Address
        <input
          className="input input-bordered w-full mt-1"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </label>

      <ImageUploadField
        label="Profile photo"
        value={user.image_url}
        onFileSelect={setPendingFile}
        folder="profile"
      />

      <label className="text-sm block">
        Email
        <input className="input input-bordered w-full mt-1 opacity-60" value={user.email} disabled />
      </label>

      {uploadError && <p className="text-error text-sm">Photo upload failed. Try again.</p>}
      {error && <p className="text-error text-sm">Couldn't save changes. Try again.</p>}
      {saved && <p className="text-success text-sm">Profile updated.</p>}

      <button className="btn btn-primary" disabled={isLoading}>
        {isUploading ? "Uploading..." : isSaving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
