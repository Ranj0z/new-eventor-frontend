import { useState, type FormEvent } from "react";
import { X, Trash2 } from "lucide-react";
import type { TUser } from "../../reducers/users/usersAPI";
import {
  useUpdateUserMutation,
  usePromoteToHostMutation,
  usePromoteToAdminMutation,
  useDowngradeToUserMutation,
  useDeleteUserMutation,
} from "../../reducers/users/usersAPI";

type UserModalProps = {
  user: TUser;
  onClose: () => void;
};

// Never touches password or verification_code — see eventor-build-spec.md
// §8/§9. Role changes go through three separate endpoints, not a generic
// PATCH — see usersAPI.ts.
export default function UserModal({ user, onClose }: UserModalProps) {
  const [updateUser, { isLoading: saving }] = useUpdateUserMutation();
  const [promoteToHost] = usePromoteToHostMutation();
  const [promoteToAdmin] = usePromoteToAdminMutation();
  const [downgradeToUser] = useDowngradeToUserMutation();
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();
  const [error, setError] = useState(false);

  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    address: user.address,
    isVerified: user.isVerified,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(false);
    try {
      await updateUser({ id: user.UserID, ...form }).unwrap();
      onClose();
    } catch {
      setError(true);
    }
  };

  const handleRoleChange = async (role: "admin" | "host" | "user") => {
    if (role === user.role) return;
    if (role === "host") await promoteToHost(user.UserID);
    else if (role === "admin") await promoteToAdmin(user.UserID);
    else await downgradeToUser(user.UserID);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${user.firstName} ${user.lastName}? This can't be undone.`)) return;
    await deleteUser(user.UserID);
    onClose();
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" aria-label="Close">
          <X size={18} />
        </button>

        <h3 className="font-display text-xl mb-1">Edit user</h3>
        <p className="text-sm text-base-content/60 mb-4">{user.email}</p>

        <label className="text-sm block mb-4">
          Role
          <select
            className="select select-bordered w-full mt-1"
            value={user.role}
            onChange={(e) => handleRoleChange(e.target.value as "admin" | "host" | "user")}
          >
            <option value="user">User</option>
            <option value="host">Host</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <form onSubmit={handleSubmit} className="space-y-3">
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

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-sm checkbox-primary"
              checked={form.isVerified}
              onChange={(e) => setForm({ ...form, isVerified: e.target.checked })}
            />
            Verified
          </label>

          {error && <p className="text-error text-sm">Couldn't save changes. Try again.</p>}

          <button className="btn btn-primary w-full" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>

        <button
          className="btn btn-ghost btn-sm text-error w-full mt-3"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 size={14} /> Delete user
        </button>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
