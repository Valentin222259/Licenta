import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Mail, Lock, Eye, EyeOff, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { apiPost } from "@/lib/api";

interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "client" | "admin";
  };
}

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

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Login ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!loginForm.email) errs.email = t("loginPage.emailRequired");
    if (!loginForm.password) errs.password = t("loginPage.passwordRequired");
    if (Object.keys(errs).length > 0) return setErrors(errs);
    setErrors({});
    setLoading(true);

    try {
      const res = await apiPost<AuthResponse>("/api/auth/login", {
        email: loginForm.email,
        password: loginForm.password,
      });

      // Salvează token și date user
      sessionStorage.setItem("token", res.token);
      sessionStorage.setItem("userId", res.user.id);
      sessionStorage.setItem("userEmail", res.user.email);
      sessionStorage.setItem("clientName", res.user.name);

      if (res.user.role === "admin") {
        sessionStorage.setItem("isAdmin", "true");
        navigate("/admin");
      } else {
        sessionStorage.setItem("isClient", "true");
        navigate("/account");
      }
    } catch (err) {
      setErrors({
        general:
          err instanceof Error
            ? err.message
            : t("loginPage.invalidCredentials"),
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Register ─────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!registerForm.name.trim()) errs.name = t("loginPage.nameRequired");
    if (!registerForm.email) errs.email = t("loginPage.emailRequired");
    if (!registerForm.phone) errs.phone = t("loginPage.phoneRequired");
    if (registerForm.password.length < 6)
      errs.password = t("loginPage.passwordTooShort");
    if (registerForm.password !== registerForm.confirm)
      errs.confirm = t("loginPage.passwordMismatch");
    if (Object.keys(errs).length > 0) return setErrors(errs);
    setErrors({});
    setLoading(true);

    try {
      const res = await apiPost<AuthResponse>("/api/auth/register", {
        name: registerForm.name,
        email: registerForm.email,
        phone: registerForm.phone,
        password: registerForm.password,
      });

      sessionStorage.setItem("token", res.token);
      sessionStorage.setItem("userId", res.user.id);
      sessionStorage.setItem("userEmail", res.user.email);
      sessionStorage.setItem("clientName", res.user.name);
      sessionStorage.setItem("isClient", "true");

      toast({
        title: "Cont creat cu succes!",
        description: `Bun venit, ${res.user.name}!`,
      });
      navigate("/account");
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : "Eroare la înregistrare",
      });
    } finally {
      setLoading(false);
    }
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

        {/* OAuth — doar UI, fără funcționalitate */}
        <div className="space-y-2.5 mb-6">
          <button
            onClick={() =>
              toast({
                title: "Google Login",
                description: t("loginPage.oauthComingSoon"),
              })
            }
            className="w-full flex items-center justify-center gap-3 bg-card border border-border rounded-md py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <GoogleIcon />
            {t("loginPage.continueWith")} Google
          </button>
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
          {(["login", "register"] as const).map((t_) => (
            <button
              key={t_}
              onClick={() => {
                setTab(t_);
                setErrors({});
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                tab === t_
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t_ === "login"
                ? t("loginPage.loginTab")
                : t("loginPage.registerTab")}
            </button>
          ))}
        </div>

        {/* Eroare generală */}
        {errors.general && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-destructive">{errors.general}</p>
          </div>
        )}

        {/* ─── LOGIN FORM ─────────────────────────────────────────────────── */}
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

            <Button
              type="submit"
              variant="hero"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Se autentifică..." : t("loginPage.signIn")}
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

        {/* ─── REGISTER FORM ──────────────────────────────────────────────── */}
        {tab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            {[
              {
                field: "name",
                label: t("booking.fullName"),
                type: "text",
                icon: User,
                placeholder: "Ion Popescu",
              },
              {
                field: "email",
                label: t("loginPage.emailLabel"),
                type: "email",
                icon: Mail,
                placeholder: "you@example.com",
              },
              {
                field: "phone",
                label: t("booking.phone"),
                type: "tel",
                icon: Phone,
                placeholder: "+40 7xx xxx xxx",
              },
            ].map(({ field, label, type, icon: Icon, placeholder }) => (
              <div key={field}>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  {label}
                </label>
                <div className="relative">
                  <Icon
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type={type}
                    value={(registerForm as any)[field]}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        [field]: e.target.value,
                      })
                    }
                    placeholder={placeholder}
                    className={inputCls(field)}
                  />
                </div>
                {errors[field] && (
                  <p className="text-xs text-destructive mt-1">
                    {errors[field]}
                  </p>
                )}
              </div>
            ))}

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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
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

            <Button
              type="submit"
              variant="hero"
              className="w-full mt-2"
              disabled={loading}
            >
              {loading ? "Se creează contul..." : t("loginPage.createAccount")}
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
