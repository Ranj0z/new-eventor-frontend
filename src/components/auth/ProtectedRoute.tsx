import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import type { TRole } from "../../reducers/users/usersAPI";

type ProtectedRouteProps = {
  allowedRoles: TRole[];
  children: React.ReactNode;
};

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const user = useSelector((state: RootState) => state.user.user);

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
