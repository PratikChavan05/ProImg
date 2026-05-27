import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { UserData } from "../context/UserContext";
import { LoadingAnimation } from "../components/Loading";
import { FaKey, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

const strengthMeta = (password) => {
  if (!password) return { level: "", width: "0%", bar: "bg-stone-200", text: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { level: "weak", width: "33%", bar: "bg-red-400", text: "Weak" };
  if (score <= 4) return { level: "medium", width: "66%", bar: "bg-amber-400", text: "Medium" };
  return { level: "strong", width: "100%", bar: "bg-fresh-500", text: "Strong" };
};

const Reset = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const { resetUser, btnLoading } = UserData();
  const navigate = useNavigate();
  const { token } = useParams();

  const strength = strengthMeta(password);

  const submitHandler = (e) => {
    e.preventDefault();
    if (!otp.trim() || !password.trim() || !confirmPassword.trim()) {
      setFormError("All fields are required");
      return;
    }
    if (otp.length !== 6) {
      setFormError("Code must be 6 digits");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }
    setFormError("");
    resetUser(token, otp, password, navigate);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-brand">ProImg</h1>
        <p className="auth-title">Reset password</p>

        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {formError}
          </div>
        )}

        <form onSubmit={submitHandler} className="space-y-4">
          <div>
            <label htmlFor="otp" className="auth-label">
              Verification code
            </label>
            <div className="relative">
              <FaKey className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 6) setOtp(value);
                }}
                maxLength={6}
                className="input-field !pl-10 text-center tracking-[0.35em] font-mono"
                placeholder="000000"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="auth-label">
              New password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field !pl-10 !pr-10"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
                  <span>Strength</span>
                  <span className="font-medium text-ink-soft">{strength.text}</span>
                </div>
                <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.bar}`}
                    style={{ width: strength.width }}
                  />
                </div>
                <p className="text-xs text-ink-faint mt-1">
                  Use uppercase, lowercase, numbers, and symbols.
                </p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="auth-label">
              Confirm password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field !pl-10 !pr-10"
                placeholder="Repeat password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label="Toggle confirm password"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {password && confirmPassword && (
              <p
                className={`text-xs mt-1 text-right ${
                  password === confirmPassword ? "text-fresh-700" : "text-red-600"
                }`}
              >
                {password === confirmPassword ? "Passwords match" : "Passwords don't match"}
              </p>
            )}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={btnLoading}>
            {btnLoading ? <LoadingAnimation /> : "Reset password"}
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

export default Reset;
