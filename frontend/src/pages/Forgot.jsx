import { useState } from "react";
import { UserData } from "../context/UserContext";
import { useNavigate, Link } from "react-router-dom";
import { LoadingAnimation } from "../components/Loading";
import { FaEnvelope } from "react-icons/fa";

const Forgot = () => {
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");
  const { btnLoading, forgotUser } = UserData();
  const navigate = useNavigate();

  const submitHandler = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setFormError("Please enter your email address");
      return;
    }
    setFormError("");
    forgotUser(email, navigate);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-brand">ProImg</h1>
        <p className="auth-title">Forgot password</p>
        <p className="text-sm text-ink-muted text-center -mt-4 mb-6">
          We&apos;ll email you a link to reset your password.
        </p>

        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {formError}
          </div>
        )}

        <form onSubmit={submitHandler} className="space-y-4">
          <div>
            <label htmlFor="email" className="auth-label">
              Email
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field !pl-10"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={btnLoading}>
            {btnLoading ? <LoadingAnimation /> : "Send reset link"}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted mt-6">
          Remember your password?{" "}
          <Link to="/login" className="text-ocean-700 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Forgot;
