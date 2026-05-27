import { useState } from "react";
import { UserData } from "../context/UserContext";
import { useNavigate, Link } from "react-router-dom";
import { LoadingAnimation } from "../components/Loading";
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import API_BASE_URL from "../config/api";

const googleLogin = () => {
  window.location.href = `${API_BASE_URL}/api/user/auth/google`;
};

const Register = () => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  const { registerUser, btnLoading } = UserData();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (id === "password") checkPasswordStrength(value);
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(strength);
  };

  const strengthBarColor =
    passwordStrength <= 1
      ? "bg-red-400"
      : passwordStrength === 2
        ? "bg-amber-400"
        : passwordStrength === 3
          ? "bg-fresh-400"
          : "bg-fresh-600";

  const submitHandler = (e) => {
    e.preventDefault();
    const { name, email, password } = formData;

    if (!name.trim() || !email.trim() || !password.trim()) {
      setFormError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters long");
      return;
    }
    if (!email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
      setFormError("Please enter a valid email address");
      return;
    }

    setFormError("");
    registerUser(name, email, password, navigate);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-brand">ProImg</h1>
        <p className="auth-title">Create account</p>

        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {formError}
          </div>
        )}

        <form onSubmit={submitHandler} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="auth-label">
              Name
            </label>
            <div className="relative">
              <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="input-field !pl-10"
                placeholder="Your full name"
              />
            </div>
          </div>

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
                value={formData.email}
                onChange={handleChange}
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
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="input-field !pl-10 !pr-10"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {formData.password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`h-1 flex-1 rounded-full ${
                        passwordStrength > index ? strengthBarColor : "bg-stone-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-ink-faint">
                  {passwordStrength === 0 && "Add length, uppercase, numbers, or symbols"}
                  {passwordStrength === 1 && "Weak — add more variety"}
                  {passwordStrength === 2 && "Fair — getting better"}
                  {passwordStrength === 3 && "Good password"}
                  {passwordStrength === 4 && "Strong password"}
                </p>
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={btnLoading}>
            {btnLoading ? <LoadingAnimation /> : "Create account"}
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
          Already have an account?{" "}
          <Link to="/login" className="text-ocean-700 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
