import type { Metadata } from "next";
import { Yeseva_One, Lora } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { AgeGate } from "@/components/layout/AgeGate";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Providers } from "@/components/layout/Providers";

const yeseva = Yeseva_One({
  variable: "--font-yeseva",
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
  weight: "400",
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sommelier Night",
  description: "Дневник дегустаций для своей компании. 18+.",
  applicationName: "Sommelier Night",
  appleWebApp: {
    capable: true,
    title: "Sommelier",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#120709",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`dark ${yeseva.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>
            <AgeGate>
              <Header />
              <main className="flex-1 flex flex-col">{children}</main>
              <Footer />
            </AgeGate>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
