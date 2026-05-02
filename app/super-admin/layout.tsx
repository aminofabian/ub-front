export default function SuperAdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-background to-muted/30 dark:from-slate-950 dark:via-background dark:to-slate-900/50">
      {children}
    </div>
  );
}
