import {
  OXANIUM_SURFACE_CLASS,
  OXANIUM_SURFACE_STYLE,
} from "@/lib/oxanium-surface";

export default function SuperAdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`min-h-screen bg-background ${OXANIUM_SURFACE_CLASS}`}
      style={OXANIUM_SURFACE_STYLE}
    >
      {children}
    </div>
  );
}
