import {
  PLUS_JAKARTA_STACK,
  plusJakarta,
} from "@/app/fonts/plus-jakarta";

export default function SuperAdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${plusJakarta.variable} ${plusJakarta.className} min-h-screen`}
      style={{
        ["--font-sans" as string]: PLUS_JAKARTA_STACK,
        ["--font-heading" as string]: PLUS_JAKARTA_STACK,
        fontFamily: PLUS_JAKARTA_STACK,
      }}
    >
      {children}
    </div>
  );
}
