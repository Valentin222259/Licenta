import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

const navLinks = [
  { to: "/", labelKey: "nav.home" },
  { to: "/rooms", labelKey: "nav.rooms" },
  { to: "/availability", label: "Disponibilitate" },
  { to: "/reviews", label: "Recenzii" },
  { to: "/contact", labelKey: "nav.contact" },
  { to: "/about", labelKey: "nav.about" },
];

const isActive = (pathname: string, to: string) => {
  if (to === "/") return pathname === "/";
  return pathname.startsWith(to);
};

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [clientName, setClientName] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const loggedIn = sessionStorage.getItem("isClient") === "true";
    const name = sessionStorage.getItem("clientName") || "";
    setIsClient(loggedIn);
    setClientName(name);
  }, [location.pathname]);

  const toggleLang = () => {
    const next = i18n.language === "en" ? "ro" : "en";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
  };

  const handleAccountClick = () => {
    if (isClient) navigate("/account");
    else navigate("/login");
    setOpen(false);
  };

  const getLabel = (link: (typeof navLinks)[0]) => {
    if ("label" in link) return link.label;
    return t(link.labelKey);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link
          to="/"
          className="font-heading text-xl font-semibold tracking-wide text-foreground"
        >
          Maramureș Belvedere
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`relative text-sm tracking-wide uppercase transition-colors hover:text-primary pb-1 ${
                isActive(location.pathname, l.to)
                  ? "text-primary font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                  : "text-muted-foreground"
              }`}
            >
              {getLabel(l)}
            </Link>
          ))}

          <button
            onClick={toggleLang}
            className="text-xs font-semibold uppercase tracking-wider border border-border rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          >
            {i18n.language === "en" ? "RO" : "EN"}
          </button>

          <button
            onClick={handleAccountClick}
            className={`flex items-center gap-1.5 text-sm tracking-wide uppercase transition-colors hover:text-primary ${
              isActive(location.pathname, "/login") ||
              isActive(location.pathname, "/account")
                ? "text-primary font-semibold"
                : "text-muted-foreground"
            }`}
          >
            <User size={15} />
            {isClient ? clientName || t("account.myAccount") : t("nav.login")}
          </button>

          <Button variant="hero" size="sm" asChild>
            <Link to="/booking">{t("nav.bookNow")}</Link>
          </Button>
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background border-b border-border animate-fade-in">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`text-sm tracking-wide uppercase py-1 border-l-2 pl-3 transition-colors ${
                  isActive(location.pathname, l.to)
                    ? "text-primary font-semibold border-primary"
                    : "text-muted-foreground border-transparent"
                }`}
              >
                {getLabel(l)}
              </Link>
            ))}

            <button
              onClick={handleAccountClick}
              className={`flex items-center gap-2 text-sm tracking-wide uppercase py-1 border-l-2 pl-3 transition-colors text-left ${
                isActive(location.pathname, "/login") ||
                isActive(location.pathname, "/account")
                  ? "text-primary font-semibold border-primary"
                  : "text-muted-foreground border-transparent"
              }`}
            >
              <User size={14} />
              {isClient ? clientName || t("account.myAccount") : t("nav.login")}
            </button>

            <button
              onClick={toggleLang}
              className="text-xs font-semibold uppercase tracking-wider border border-border rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground w-fit"
            >
              {i18n.language === "en" ? "RO" : "EN"}
            </button>

            <Button variant="hero" size="sm" asChild>
              <Link to="/booking" onClick={() => setOpen(false)}>
                {t("nav.bookNow")}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
