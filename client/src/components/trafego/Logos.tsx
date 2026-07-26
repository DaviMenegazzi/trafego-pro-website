const logos = [
  { src: "https://www.trafego.pro/manus-storage/logo_vidacard_branca_2df5c5e7.png", alt: "Vida Card" },
  { src: "https://www.trafego.pro/manus-storage/logo_oralsin_branca_034f07ac.png", alt: "Oralsin" },
  { src: "https://www.trafego.pro/manus-storage/logo_univates_12651e4a.png", alt: "Univates" },
  { src: "https://www.trafego.pro/manus-storage/logo_hospital_santa_lucia_89e92c94.png", alt: "Hospital Regional Santa Lúcia" },
  { src: "https://www.trafego.pro/manus-storage/logo_anhanguera_7d6176ba.webp", alt: "Anhanguera" },
  { src: "https://www.trafego.pro/manus-storage/logo_naxia_990a83d9.png", alt: "Naxia" },
];

export function Logos() {
  const row = [...logos, ...logos];
  return (
    <section className="border-y border-border/60 py-14">
      <p className="text-center text-xs uppercase tracking-[0.24em] text-muted-foreground mb-10">
        Empresas que confiam na Tráfego Pro
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-marquee gap-16 md:gap-24 items-center">
          {row.map((l, i) => (
            <img
              key={i}
              src={l.src}
              alt={l.alt}
              className="h-8 md:h-10 w-auto opacity-50 hover:opacity-90 transition-opacity grayscale"
              loading="lazy"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
