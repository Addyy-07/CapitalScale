import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle, Loader2, ArrowRight, RotateCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext.jsx';

export default function OtpVerificationForm({
  tempToken,
  onVerifySuccess,
  onCancel,
  setTempToken, // Needed if resend generates a new temp token
}) {
  const { verifyMfa, resendOtp, isLoading } = useAuth();
  
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    setResendSuccess('');
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit verification code.');
      return;
    }
    try {
      await verifyMfa(tempToken, otpCode);
      onVerifySuccess();
    } catch (err) {
      setOtpError(err?.response?.data?.message || 'Verification failed. Please check the code.');
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setOtpError('');
    setResendSuccess('');
    try {
      const result = await resendOtp(tempToken);
      if (result?.tempToken) {
        setTempToken(result.tempToken);
      }
      setResendSuccess('A new verification code has been sent to your email.');
      setCountdown(60); // Reset timer
      setOtpCode(''); // Clear the input
    } catch (err) {
      setOtpError(err?.response?.data?.message || 'Failed to resend code. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 mb-4">
              <Lock className="w-7 h-7 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">MFA Verification</h1>
            <p className="text-slate-400 text-sm">Please enter the 6-digit OTP code sent to your email</p>
          </div>

          {otpError && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-6">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-400 text-sm">{otpError}</p>
            </div>
          )}

          {resendSuccess && (
            <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-6">
              <div className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0 rounded-full bg-emerald-400/20 flex items-center justify-center">
                <span className="text-[10px] font-bold">✓</span>
              </div>
              <p className="text-emerald-400 text-sm">{resendSuccess}</p>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="otp-code" className="block text-sm font-medium text-slate-300">
                Verification Code
              </label>
              <input
                id="otp-code"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-white placeholder-slate-500 text-lg tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify & Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 space-y-4 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || isLoading}
              className="text-blue-400 hover:text-blue-300 disabled:text-slate-500 text-sm transition-colors font-medium flex items-center justify-center gap-2 mx-auto"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading && countdown === 0 ? 'animate-spin' : ''}`} />
              {countdown > 0 ? `Resend Code in ${countdown}s` : 'Resend Code'}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
