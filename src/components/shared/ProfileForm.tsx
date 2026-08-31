import { useState, type FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import { useUpdateUserMutation } from "../../reducers/users/usersAPI";
import { loginSuccess } from "../../reducers/login/userSlice";

// Same fields for admin, host and user — role/verification aren't editable
// here, that's an admin-only action on UserModal. Never touches password or
// verification_code. See eventor-build-spec.md §8.
export default function ProfileForm() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.user);
  const [updateUser, { isLoading, error }] = useUpdateUserMutation();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phoneNumber: user?.phoneNumber ?? "",
    address: user?.address ?? "",
    image_url: user?.image_url ?? "",
  });

  if (!user || !token) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    try {
      const updated = await updateUser({ id: user.UserID, ...form }).unwrap();
      dispatch(loginSuccess({ token, user: updated }));
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

      <label className="text-sm block">
        Profile image URL
        <input
          className="input input-bordered w-full mt-1"
          value={form.image_url ?? ""}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          placeholder="https://..."
        />
      </label>

      <label className="text-sm block">
        Email
        <input className="input input-bordered w-full mt-1 opacity-60" value={user.email} disabled />
      </label>

      {error && <p className="text-error text-sm">Couldn't save changes. Try again.</p>}
      {saved && <p className="text-success text-sm">Profile updated.</p>}

      <button className="btn btn-primary" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
