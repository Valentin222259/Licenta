import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Mail, Lock, Eye, EyeOff, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const Login = () => {
  const { t } = useTranslation();
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
    toast({
      title: t("loginPage.guestLoginToast"),
      description: t("loginPage.guestLoginToastDesc"),
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateRegister();
    if (Object.keys(errs).length > 0) return setErrors(errs);
    setErrors({});
    toast({
      title: t("loginPage.registerToast"),
      description: t("loginPage.registerToastDesc"),
    });
  };

  const inputCls = (field: string) =>
    `w-full bg-muted border rounded-md pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring transition-colors ${
      errors[field] ? "border-destructive" : "border-border"
    }`;

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

        {/* Tabs */}
        <div className="flex bg-muted rounded-lg p-1 mb-8">
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
