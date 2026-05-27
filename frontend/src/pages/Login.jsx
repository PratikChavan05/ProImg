import { useState, useEffect } from "react";
import { UserData } from "../context/UserContext";
import { useNavigate, Link } from "react-router-dom";
import { LoadingAnimation } from "../components/Loading";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import API_BASE_URL from "../config/api";

const googleLogin = () => {
  window.location.href = `${API_BASE_URL}/api/user/auth/google`;
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState("");

  const { loginUser, btnLoading } = UserData();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("proimg_email");
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const submitHandler = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setFormError("Please fill in all fields");
      return;
    }
    if (rememberMe) localStorage.setItem("proimg_email", email);
    else localStorage.removeItem("proimg_email");
    setFormError("");
    loginUser(email, password, navigate);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-brand">ProImg</h1>
        <p className="auth-title">Welcome back</p>

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

          <div>
            <label htmlFor="password" className="auth-label">
              Password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field !pl-10 !pr-10"
                placeholder="••••••••"
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
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-ink-muted cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="rounded border-stone-300 text-ocean-600 focus:ring-ocean-500"
              />
              Remember me
            </label>
            <Link to="/forgot" className="text-ocean-700 font-medium hover:underline">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={btnLoading}>
            {btnLoading ? <LoadingAnimation /> : "Sign in"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <button type="button" onClick={googleLogin} className="btn-secondary w-full">
          <FaGoogle className="text-lg" />
          Google
        </button>

        <p className="text-center text-sm text-ink-muted mt-6">
          New here?{" "}
          <Link to="/register" className="text-ocean-700 font-semibold hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
