import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { KeyRound, Shield, Eye, EyeOff } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulăm un delay mic (ca un apel real la backend)
    setTimeout(() => {
      if (email === "admin@belvedere.ro" && password === "admin123") {
        sessionStorage.setItem("isAdmin", "true");
        // Asigurăm că nu există sesiune de client activă
        sessionStorage.removeItem("isClient");
        sessionStorage.removeItem("clientName");
        navigate("/admin");
      } else {
        setError("Email sau parolă incorectă. Încearcă din nou.");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex bg-[hsl(152,35%,12%)]">
      {/* Coloana stângă — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Pattern decorativ */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border-2 border-white" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full border border-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-white" />
        </div>

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-8 backdrop-blur-sm border border-white/20">
            <Shield size={36} className="text-white" />
          </div>
          <h1 className="font-heading text-4xl text-white font-semibold mb-4">
            Panou Administrare
          </h1>
          <p className="text-white/60 text-lg max-w-sm leading-relaxed">
            Maramureș Belvedere — gestionează rezervările, camerele și
            analiticile pensiunii.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[
              { label: "Rezervări", value: "247" },
              { label: "Ocupare", value: "78%" },
              { label: "Rating", value: "9.6" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10"
              >
                <p className="font-heading text-2xl text-white font-semibold">
                  {stat.value}
                </p>
                <p className="text-white/50 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coloana dreaptă — formular login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[hsl(152,30%,97%)]">
        <div className="w-full max-w-sm">
          {/* Header mobil (vizibil doar pe mobile) */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-[hsl(152,35%,25%)] flex items-center justify-center mx-auto mb-4">
              <KeyRound size={24} className="text-white" />
            </div>
            <h2 className="font-heading text-2xl text-[hsl(152,35%,15%)]">
              Panou Administrare
            </h2>
            <p className="text-[hsl(152,10%,50%)] text-sm mt-1">
              Maramureș Belvedere
            </p>
          </div>

          {/* Badge admin */}
          <div className="hidden lg:flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[hsl(152,35%,25%)] flex items-center justify-center">
              <KeyRound size={16} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-[hsl(152,35%,15%)] text-sm">
                Acces administrator
              </p>
              <p className="text-[hsl(152,10%,50%)] text-xs">
                Zona restricționată
              </p>
            </div>
          </div>

          <h2 className="font-heading text-3xl text-[hsl(152,35%,15%)] mb-1">
            Bine ai revenit
          </h2>
          <p className="text-[hsl(152,10%,50%)] text-sm mb-8">
            Autentifică-te pentru a accesa panoul de control.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(152,15%,40%)] mb-2 block">
                Email administrator
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@belvedere.ro"
                className="w-full bg-white border border-[hsl(152,20%,85%)] rounded-lg px-4 py-3 text-sm text-[hsl(152,35%,15%)] outline-none focus:ring-2 focus:ring-[hsl(152,35%,25%)] focus:border-transparent transition-all"
              />
            </div>

            {/* Parolă */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(152,15%,40%)] mb-2 block">
                Parolă
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-[hsl(152,20%,85%)] rounded-lg px-4 py-3 pr-12 text-sm text-[hsl(152,35%,15%)] outline-none focus:ring-2 focus:ring-[hsl(152,35%,25%)] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(152,10%,55%)] hover:text-[hsl(152,35%,25%)] transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Eroare */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[hsl(152,35%,25%)] hover:bg-[hsl(152,35%,20%)] text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Se verifică...
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Autentificare
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[hsl(152,20%,88%)]">
            <p className="text-xs text-center text-[hsl(152,10%,60%)]">
              Zonă restricționată · Acces neautorizat este interzis
            </p>
            <p className="text-xs text-center text-[hsl(152,10%,70%)] mt-1">
              © {new Date().getFullYear()} Maramureș Belvedere
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
