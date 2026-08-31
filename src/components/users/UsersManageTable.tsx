import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useGetAllUsersQuery } from "../../reducers/users/usersAPI";
import type { TUser } from "../../reducers/users/usersAPI";
import UserModal from "./UserModal";
import { TableSkeleton } from "../shared/Skeletons";

const roleBadge: Record<TUser["role"], string> = {
  admin: "badge-error",
  host: "badge-secondary",
  user: "badge-ghost",
};

export default function UsersManageTable() {
  const { data, isLoading, error } = useGetAllUsersQuery();
  const [editing, setEditing] = useState<TUser | null>(null);

  const users = data?.data ?? [];

  return (
    <section>
      <h1 className="font-display text-2xl mb-6">Users</h1>

      {isLoading && <TableSkeleton columns={5} />}
      {error && <p className="text-error">Couldn't load users.</p>}

      {!isLoading && !error && users.length === 0 && (
        <p className="text-base-content/60">No users found.</p>
      )}

      {!!users.length && (
        <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Verified</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.UserID} className="hover cursor-pointer" onClick={() => setEditing(u)}>
                  <td>
                    {u.firstName} {u.lastName}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge badge-sm ${roleBadge[u.role]}`}>{u.role}</span>
                  </td>
                  <td>
                    {u.isVerified ? (
                      <CheckCircle2 size={16} className="text-success" />
                    ) : (
                      <XCircle size={16} className="text-base-content/30" />
                    )}
                  </td>
                  <td className="text-right">
                    <button className="btn btn-ghost btn-xs" onClick={() => setEditing(u)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <UserModal user={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}