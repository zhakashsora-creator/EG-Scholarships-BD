import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EG Global Study Maps | Interactive Scholarship & University World Map",
  description:
    "বাংলাদেশি শিক্ষার্থীদের জন্য ৭৮+ দেশের ৬৩৫+ ভেরিফায়েড স্কলারশিপ, টিউশন ফি, লিভিং কস্ট ও শীর্ষ বিশ্ববিদ্যালয়ের সমন্বিত ইন্টারেক্টিভ মানচিত্র।",
  metadataBase: new URL("https://scholarships.egconsultancy.com.bd"),
  alternates: {
    canonical: "/maps",
  },
  openGraph: {
    title: "EG Global Study Maps | Interactive World Map for BD Students",
    description:
      "৭৮+ দেশের ৬৩৫+ ভেরিফায়েড স্কলারশিপ, টিউশন ফি, লিভিং কস্ট ও ১০০ শীর্ষ বিশ্ববিদ্যালয়ের মানচিত্র। Study abroad with a plan, not confusion.",
    url: "https://scholarships.egconsultancy.com.bd/maps",
    siteName: "Excellence Global Consultancy",
    type: "website",
    locale: "bn_BD",
    images: [
      {
        url: "https://scholarships.egconsultancy.com.bd/og-maps.png",
        secureUrl: "https://scholarships.egconsultancy.com.bd/og-maps.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "EG Global Study Maps - Interactive World Map for Bangladeshi Students",
      },
      {
        url: "https://scholarships.egconsultancy.com.bd/og-maps.jpg",
        secureUrl: "https://scholarships.egconsultancy.com.bd/og-maps.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "EG Global Study Maps - Interactive World Map for Bangladeshi Students",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EG Global Study Maps | Interactive World Map for BD Students",
    description:
      "৭৮+ দেশের ৬৩৫+ ভেরিফায়েড স্কলারশিপ, টিউশন ফি ও ১০০ শীর্ষ বিশ্ববিদ্যালয়ের মানচিত্র। Study abroad with a plan, not confusion.",
    images: ["https://scholarships.egconsultancy.com.bd/og-maps.png"],
  },
  other: {
    image: "https://scholarships.egconsultancy.com.bd/og-maps.png",
  },
};

export default function MapsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
