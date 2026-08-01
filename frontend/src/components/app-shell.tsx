"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { LoginModal } from "./login-modal";
import { RegisterModal } from "./register-modal";
import { ForgotPasswordModal } from "./forgot-password-modal";
import styles from "./app-shell.module.css";

type AuthView = "login" | "register" | "forgot" | null;

export function AppShell({
  activeNav,
  pageTitle,
  children,
}: {
  activeNav: "problems" | "contests" | "guide";
  pageTitle: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [authView, setAuthView] = useState<AuthView>(null);

  return (
    <div className={styles.shell}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        active={activeNav}
      />

      <div className={styles.main}>
        <Topbar pageTitle={pageTitle} onLoginClick={() => setAuthView("login")} />
        <div className={styles.content}>{children}</div>
      </div>

      {authView === "login" && (
        <LoginModal
          onClose={() => setAuthView(null)}
          onSwitchToRegister={() => setAuthView("register")}
          onSwitchToForgotPassword={() => setAuthView("forgot")}
        />
      )}
      {authView === "register" && (
        <RegisterModal
          onClose={() => setAuthView(null)}
          onSwitchToLogin={() => setAuthView("login")}
        />
      )}
      {authView === "forgot" && (
        <ForgotPasswordModal
          onClose={() => setAuthView(null)}
          onSwitchToLogin={() => setAuthView("login")}
        />
      )}
    </div>
  );
}
