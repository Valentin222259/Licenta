import {
  Bike,
  Utensils,
  Snowflake,
  ParkingCircle,
  Waves,
  Gamepad2,
  Baby,
  Shirt,
} from "lucide-react";
import heroImageFallback from "@/assets/hero-mountains.jpg";
import { useTranslation } from "react-i18next";
import { useFacilityImages, useAboutImages } from "@/lib/useImages";

// IMPORTANT: Ordinea TREBUIE să fie identică cu FACILITIES din AdminImages.tsx
const facilities = [
  { icon: Waves, titleKey: "about.jacuzziTitle", descKey: "about.jacuzziDesc" },
  { icon: Bike, titleKey: "about.bikesTitle", descKey: "about.bikesDesc" },
  {
    icon: Gamepad2,
    titleKey: "about.pingPongTitle",
    descKey: "about.pingPongDesc",
  },
  { icon: Snowflake, titleKey: "about.sledsTitle", descKey: "about.sledsDesc" },
  { icon: Utensils, titleKey: "about.grillTitle", descKey: "about.grillDesc" },
  {
    icon: ParkingCircle,
    titleKey: "about.parkingTitle",
    descKey: "about.parkingDesc",
  },
  {
    icon: Baby,
    titleKey: "about.playgroundTitle",
    descKey: "about.playgroundDesc",
  },
  {
    icon: Shirt,
    titleKey: "about.traditionalTitle",
    descKey: "about.traditionalDesc",
  },
];

const About = () => {
  const { t } = useTranslation();

  // 1 singură imagine pentru secțiunea poveste
  const { primary: aboutPrimary } = useAboutImages();

  // Imaginile facilităților — sortate după sort_order, asociate în ordine cu facilitățile
  const { images: facilityImages } = useFacilityImages();

  const heroSrc = aboutPrimary?.url || heroImageFallback;

  return (
    <div>
      {/* Hero banner */}
      <section className="relative h-72 md:h-96 flex items-center justify-center overflow-hidden">
        <img
          src={heroSrc}
          alt="Pensiunea Maramureș Belvedere"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-foreground/50" />
        <div className="relative z-10 text-center px-4">
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-background font-semibold mb-3">
            {t("about.heroTitle")}
          </h1>
          <p className="text-background/90 text-base sm:text-lg max-w-xl mx-auto">
            {t("about.heroSubtitle")}
          </p>
        </div>
      </section>

      {/* Povestea */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-heading text-3xl mb-6">
                {t("about.storyTitle")}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t("about.storyP1")}
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t("about.storyP2")}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {t("about.storyP3")}
              </p>
            </div>
            <div className="relative">
              {/* 1 singură poză pentru poveste */}
              {aboutPrimary ? (
                <img
                  src={aboutPrimary.url}
                  alt="Pensiunea Maramureș Belvedere"
                  className="w-full h-80 object-cover rounded-xl shadow-lg"
                />
              ) : (
                <div className="w-full h-80 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border">
                  <div className="text-center text-muted-foreground">
                    <div className="text-4xl mb-2">📷</div>
                    <p className="text-sm">{t("about.photoGuesthouse")}</p>
                    <p className="text-xs mt-1 opacity-60">
                      ({t("about.photoPlaceholder")})
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Distanțe */}
      <section className="py-12 px-4 bg-muted">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-heading text-2xl text-center mb-8">
            {t("about.distancesTitle")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { loc: "Mănăstirea Izvorul Tămăduirii", dist: "4–5 km" },
              { loc: "Bârsana", dist: "15 km" },
              { loc: "Sighetu Marmației", dist: "29 km" },
              { loc: "Ieud", dist: "30 km" },
              { loc: "Vișeu de Sus", dist: "25 km" },
              { loc: "Borșa", dist: "48 km" },
              { loc: "Moisei", dist: "37 km" },
              { loc: "Dragomirești", dist: "32 km" },
              { loc: "Săpânța", dist: "53 km" },
              { loc: "Ocna Șugatag", dist: "35 km" },
              { loc: "Breb", dist: "40 km" },
              { loc: "Vadu Izei", dist: "38 km" },
            ].map((item) => (
              <div
                key={item.loc}
                className="bg-card rounded-md px-4 py-3 flex justify-between items-center text-sm"
              >
                <span className="text-foreground">{item.loc}</span>
                <span className="text-muted-foreground font-medium ml-2 shrink-0">
                  {item.dist}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facilități */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-heading text-3xl text-center mb-4">
            {t("about.facilitiesTitle")}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            {t("about.facilitiesSubtitle")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {facilities.map((facility, index) => {
              // Imaginea pentru această facilitate — index corespunde poziției din admin
              const facilityImg = facilityImages[index] || null;

              return (
                <div
                  key={index}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  {facilityImg ? (
                    <img
                      src={facilityImg.url}
                      alt={facilityImg.caption || t(facility.titleKey)}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center border-b border-border">
                      <div className="text-center text-muted-foreground">
                        <div className="text-3xl mb-1">📷</div>
                        <p className="text-xs">{t("about.photoPlaceholder")}</p>
                      </div>
                    </div>
                  )}

                  <div className="p-5 flex gap-4">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <facility.icon size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg mb-1">
                        {t(facility.titleKey)}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t(facility.descKey)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Politica copii */}
      <section className="py-12 px-4 bg-muted">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-2xl mb-4">{t("about.kidsTitle")}</h2>
          <p
            className="text-muted-foreground leading-relaxed mb-3"
            dangerouslySetInnerHTML={{ __html: t("about.kidsP1") }}
          />
          <p
            className="text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: t("about.kidsP2") }}
          />
        </div>
      </section>
    </div>
  );
};

export default About;
