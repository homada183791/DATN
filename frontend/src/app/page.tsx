"use client";

import { useState } from "react";
import { LoginModal } from "@/components/login-modal";
import { RegisterModal } from "@/components/register-modal";
import { ForgotPasswordModal } from "@/components/forgot-password-modal";

type View = "login" | "register" | "forgot" | "closed";

export default function HomePage() {
  const [view, setView] = useState<View>("login");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {view === "closed" && (
        <button
          onClick={() => setView("login")}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Mở lại khung đăng nhập
        </button>
      )}

      {view === "login" && (
        <LoginModal
          onClose={() => setView("closed")}
          onSwitchToRegister={() => setView("register")}
          onSwitchToForgotPassword={() => setView("forgot")}
        />
      )}

      {view === "register" && (
        <RegisterModal
          onClose={() => setView("closed")}
          onSwitchToLogin={() => setView("login")}
        />
      )}

      {view === "forgot" && (
        <ForgotPasswordModal
          onClose={() => setView("closed")}
          onSwitchToLogin={() => setView("login")}
        />
      )}
    </div>
  );
}
