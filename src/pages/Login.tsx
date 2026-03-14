import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Mail, Lock, Eye, EyeOff, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const GoogleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-5 h-5"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const AppleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-5 h-5 fill-foreground"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const FacebookIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-5 h-5"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      fill="#1877F2"
    />
  </svg>
);

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateLogin = () => {
    const e: Record<string, string> = {};
    if (!loginForm.email) e.email = t("loginPage.emailRequired");
    if (!loginForm.password) e.password = t("loginPage.passwordRequired");
    return e;
  };

  const validateRegister = () => {
    const e: Record<string, string> = {};
    if (!registerForm.name.trim()) e.name = t("loginPage.nameRequired");
    if (!registerForm.email) e.email = t("loginPage.emailRequired");
    if (!registerForm.phone) e.phone = t("loginPage.phoneRequired");
    if (registerForm.password.length < 6)
      e.password = t("loginPage.passwordTooShort");
    if (registerForm.password !== registerForm.confirm)
      e.confirm = t("loginPage.passwordMismatch");
    return e;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateLogin();
    if (Object.keys(errs).length > 0) return setErrors(errs);
    setErrors({});
    // TODO: înlocuit cu backend real
    sessionStorage.setItem("isClient", "true");
    sessionStorage.setItem("clientName", loginForm.email.split("@")[0]);
    navigate("/account");
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateRegister();
    if (Object.keys(errs).length > 0) return setErrors(errs);
    setErrors({});
    // TODO: înlocuit cu backend real
    sessionStorage.setItem("isClient", "true");
    sessionStorage.setItem("clientName", registerForm.name.split(" ")[0]);
    navigate("/account");
  };

  const handleOAuth = (provider: string) => {
    toast({
      title: `${provider} Login`,
      description: t("loginPage.oauthComingSoon"),
    });
  };

  const inputCls = (field: string) =>
    `w-full bg-muted border rounded-md pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring transition-colors ${
      errors[field] ? "border-destructive" : "border-border"
    }`;

  const oauthProviders = [
    { name: "Google", icon: <GoogleIcon /> },
    { name: "Apple", icon: <AppleIcon /> },
    { name: "Facebook", icon: <FacebookIcon /> },
  ];

  return (
    <div className="pt-24 pb-20 px-4 min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-primary" />
          </div>
          <h1 className="font-heading text-3xl mb-2">{t("loginPage.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("loginPage.subtitle")}
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-2.5 mb-6">
          {oauthProviders.map((p) => (
            <button
              key={p.name}
              onClick={() => handleOAuth(p.name)}
              className="w-full flex items-center justify-center gap-3 bg-card border border-border rounded-md py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              {p.icon}
              {t("loginPage.continueWith")} {p.name}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("loginPage.orEmail")}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Tabs */}
        <div className="flex bg-muted rounded-lg p-1 mb-6">
          <button
            onClick={() => {
              setTab("login");
              setErrors({});
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              tab === "login"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("loginPage.loginTab")}
          </button>
          <button
            onClick={() => {
              setTab("register");
              setErrors({});
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              tab === "register"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("loginPage.registerTab")}
          </button>
        </div>

        {/* Login Form */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                {t("loginPage.emailLabel")}
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  placeholder="you@example.com"
                  className={inputCls("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                {t("loginPage.passwordLabel")}
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  placeholder="••••••••"
                  className={`${inputCls("password")} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive mt-1">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  toast({
                    title: t("loginPage.forgotToast"),
                    description: t("loginPage.forgotToastDesc"),
                  })
                }
                className="text-xs text-primary hover:underline"
              >
                {t("loginPage.forgotPassword")}
              </button>
            </div>

            <Button type="submit" variant="hero" className="w-full">
              {t("loginPage.signIn")}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-2">
              {t("loginPage.noAccount")}{" "}
              <button
                type="button"
                onClick={() => {
                  setTab("register");
                  setErrors({});
                }}
                className="text-primary hover:underline font-medium"
              >
                {t("loginPage.registerTab")}
              </button>
            </p>
          </form>
        )}

        {/* Register Form */}
        {tab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                {t("booking.fullName")}
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, name: e.target.value })
                  }
                  placeholder="Ion Popescu"
                  className={inputCls("name")}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                {t("loginPage.emailLabel")}
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, email: e.target.value })
                  }
                  placeholder="you@example.com"
                  className={inputCls("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                {t("booking.phone")}
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, phone: e.target.value })
                  }
                  placeholder="+40 7xx xxx xxx"
                  className={inputCls("phone")}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-destructive mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                {t("loginPage.passwordLabel")}
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      password: e.target.value,
                    })
                  }
                  placeholder="Minim 6 caractere"
                  className={`${inputCls("password")} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive mt-1">
                  {errors.password}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                {t("loginPage.confirmPassword")}
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={registerForm.confirm}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      confirm: e.target.value,
                    })
                  }
                  placeholder="••••••••"
                  className={`${inputCls("confirm")} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirm && (
                <p className="text-xs text-destructive mt-1">
                  {errors.confirm}
                </p>
              )}
            </div>

            <Button type="submit" variant="hero" className="w-full mt-2">
              {t("loginPage.createAccount")}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-2">
              {t("loginPage.haveAccount")}{" "}
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setErrors({});
                }}
                className="text-primary hover:underline font-medium"
              >
                {t("loginPage.loginTab")}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
