import tailwindcss from "@tailwindcss/vite";

// Sunum prototipi: backend yok, tüm veri sayfaların içinde. Giriş: /prototype/supplier-contracts
export default defineNuxtConfig({
  compatibilityDate: "2026-08-26",
  devtools: { enabled: false },
  ssr: false,
  devServer: { port: 3007 },
  vite: { plugins: [tailwindcss()] },
  modules: ["shadcn-nuxt"],
  shadcn: { prefix: "", componentDir: "app/components/ui" },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      title: "Tedarikçi Sözleşmesi Prototipi",
      meta: [{ charset: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" },
      ],
    },
  },
});
