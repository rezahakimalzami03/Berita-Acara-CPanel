// REVISI PENTING: file ini WAJIB "edge-safe" — tidak boleh import bcryptjs
// atau modul database (pg), karena middleware.js Next.js berjalan di Edge
// Runtime yang tidak mendukung modul Node.js seperti itu. File ini hanya
// dipakai untuk MENGECEK apakah user sudah login (baca token/cookie), bukan
// untuk verifikasi username/password (itu ada di lib/auth.js, jalan di server
// Node biasa lewat API route).
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
      }
      return session;
    },
  },
  providers: [], // diisi di lib/auth.js (Node runtime)
};
