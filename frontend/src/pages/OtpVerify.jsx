import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { UserData } from "../context/UserContext";
import { LoadingAnimation } from "../components/Loading";
import { FaKey } from "react-icons/fa";

const OtpVerify = () => {
  const [otp, setOtp] = useState("");
  const [formError, setFormError] = useState("");
  const [timeLeft, setTimeLeft] = useState(300);
  const { verify, btnLoading } = UserData();
  const navigate = useNavigate();
  const { token } = useParams();

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const submitHandler = (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setFormError("Please enter the verification code");
      return;
    }
    if (otp.length !== 6) {
      setFormError("Verification code must be 6 digits");
      return;
    }
    setFormError("");
    verify(token, otp, navigate);
  };

  const handleResendOtp = () => {
    setTimeLeft(300);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-brand">ProImg</h1>
        <p className="auth-title">Verify code</p>
        <p className="text-sm text-ink-muted text-center -mt-4 mb-6">
          Enter the 6-digit code we sent to your email.
        </p>

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
                pattern="\d{6}"
                className="input-field !pl-10 text-center tracking-[0.35em] font-mono"
                placeholder="000000"
              />
            </div>
          </div>

          <p
            className={`text-sm text-center ${
              timeLeft > 60 ? "text-ink-muted" : "text-red-600 font-medium"
            }`}
          >
            Code expires in {formatTime(timeLeft)}
          </p>

          <button type="submit" className="btn-primary w-full" disabled={btnLoading}>
            {btnLoading ? <LoadingAnimation /> : "Verify code"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={timeLeft > 0}
            className={`text-sm font-medium ${
              timeLeft > 0
                ? "text-ink-faint cursor-not-allowed"
                : "text-ocean-700 hover:underline"
            }`}
          >
            {timeLeft > 0
              ? "Resend available after countdown"
              : "Didn't receive it? Resend code"}
          </button>
          <p className="text-sm text-ink-muted">
            <Link to="/login" className="text-ocean-700 font-semibold hover:underline">
              Return to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OtpVerify;
