import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Hubot_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const hubotSans = Hubot_Sans({
  variable: "--font-hubot",
  subsets: ["latin"],
});

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Liga Futbolin NTT DATA",
  description: "Primera iteracion de la liga interna de futbolin",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${hubotSans.variable} ${atkinson.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
