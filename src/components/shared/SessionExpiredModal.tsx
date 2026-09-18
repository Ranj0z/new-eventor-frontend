import { useNavigate } from "react-router-dom";
import { LogIn, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { clearSessionExpired } from "../../reducers/login/userSlice";
import type { UserState } from "../../reducers/login/userSlice";

// Mounted once, at the top level (Layout.tsx), so it shows regardless of
// which page/request triggered it. Dismissible — closing it does NOT
// suppress future occurrences; it only resets this one instance's
// visibility, and authBaseQuery will raise it again on the next 401
// (e.g. the next time the user attempts an action that needs auth).
export default function SessionExpiredModal() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const sessionExpired = useSelector((state: { user: UserState }) => state.user.sessionExpired);

  if (!sessionExpired) return null;

  const close = () => dispatch(clearSessionExpired());

  const goToLogin = () => {
    close();
    navigate("/login");
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-sm text-center">
        <button onClick={close} className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" aria-label="Close">
          <X size={18} />
        </button>

        <div className="flex justify-center mb-3">
          <div className="rounded-full bg-warning/15 p-3">
            <LogIn size={24} className="text-warning" />
          </div>
        </div>

        <h3 className="font-display text-lg mb-1">Your session has expired</h3>
        <p className="text-sm text-base-content/70 mb-5">Log in to continue.</p>

        <button className="btn btn-primary w-full" onClick={goToLogin}>
          Log in again
        </button>
      </div>
      <div className="modal-backdrop" onClick={close} />
    </div>
  );
}
