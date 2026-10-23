import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/logo.jpg";
import sideImage from "../assets/002.jpg";
import { authApi } from "../services/api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setErrorMessage("Reset token is missing in the URL.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword(token, password);
      setSuccessMessage("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 3000);
    } catch (error) {
      console.error("Reset password error:", error);
      setIsLoading(false);
      setErrorMessage(error.message || "Failed to reset password.");
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Section */}
      <div className="hidden md:flex w-1/2 bg-gray-900 text-white flex-col justify-center px-10">
        <div className="mb-10">
          <img
            src={sideImage}
            alt="Security"
            className="rounded-lg shadow-lg object-cover w-full h-auto"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-4 leading-snug">
            Choose a strong new password.
          </h1>
          <p className="text-gray-300">
            Ensure your account remains secure with a combination of letters, numbers, and symbols.
          </p>
        </div>
      </div>

      {/* Right Section (Form) */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 bg-white">
        <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <img
              src={logo}
              alt="HRM logo"
              className="w-12 h-12 mr-2 rounded-full shadow-sm"
              loading="lazy"
            />
            <h2 className="text-3xl font-bold text-gray-800">
              New <span className="text-blue-600">Password</span>
            </h2>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Success Message */}
            {successMessage && (
              <div
                className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm"
                role="alert"
              >
                <div className="flex items-start">
                  <span className="text-xl mr-2">✅</span>
                  <div>
                    <p className="font-semibold">Success</p>
                    <p>{successMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                role="alert"
              >
                <div className="flex items-start">
                  <span className="text-xl mr-2">⚠️</span>
                  <div>
                    <p className="font-semibold">Error</p>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Password Inputs */}
            <div>
              <label htmlFor="pass" className="block text-sm font-medium text-gray-700">
                New Password<span className="text-red-500">*</span>
              </label>
              <input
                id="pass"
                name="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage("");
                }}
                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••"
                disabled={isLoading || !token}
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPass" className="block text-sm font-medium text-gray-700">
                Confirm New Password<span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPass"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrorMessage("");
                }}
                className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••"
                disabled={isLoading || !token}
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !token}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition transform hover:scale-[1.02] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          {/* Back to Login */}
          <p className="text-center text-sm mt-6">
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
