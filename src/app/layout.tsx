import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { LANGUAGE_COOKIE, parseLanguageMode } from "@/domain/common/language-cookie";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin", "latin-ext", "vietnamese"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Job Hunter", template: "%s · Job Hunter" },
  description: "Run #10 — personalized, bilingual job application and interview preparation packages.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The language mode is mirrored to a cookie so SSR renders the user's mode (no post-mount
  // re-render of every bilingual node and no layout shift on full page loads).
  const initialLanguage = parseLanguageMode((await cookies()).get(LANGUAGE_COOKIE)?.value);
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers initialLanguage={initialLanguage}>{children}</Providers>
      </body>
    </html>
  );
}
