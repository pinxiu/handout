import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Handout Bridge",
  description: "Turn English church handouts into editable bilingual Google Docs.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
