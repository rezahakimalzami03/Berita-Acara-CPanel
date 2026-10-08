import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Berita Acara Troli Emergency",
  description: "Sistem digital Berita Acara Pembukaan/Penutupan Troli Emergency",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
