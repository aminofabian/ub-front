export default function SuperAdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-slate-100/80 text-foreground antialiased dark:from-[oklch(0.14_0.02_264)] dark:via-background dark:to-[oklch(0.12_0.02_264)]">
      {children}
    </div>
  );
}
