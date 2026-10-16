import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "EG Scholarships BD | Student Scholarship Workspace";
  const description = "A secure, profile-led scholarship discovery and consultant workflow for Bangladeshi students.";
  return {
    title,
    description,
    icons: { icon: "/og.png", shortcut: "/og.png" },
    openGraph: { title, description, type: "website", url: origin, images: [{ url: `${origin}/og.png`, width: 1745, height: 909, alt: "EG Scholarships BD — Your profile. Your Best Finds. A clearer path forward." }] },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og.png`] },
  };
}

const themeScript = `(function(){try{var s=localStorage.getItem("eg-theme");var p=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var t=(s==="dark"||s==="light")?s:p;document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){}})();`;
const themeInlineStyles = `.theme-dark-only{display:none!important}.theme-light-only{display:inline!important}[data-theme="dark"] .theme-dark-only{display:inline!important}[data-theme="dark"] .theme-light-only{display:none!important}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <style dangerouslySetInnerHTML={{ __html: themeInlineStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
