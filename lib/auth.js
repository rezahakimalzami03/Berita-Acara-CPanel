import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { query } from './db';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Username & Password',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { username, password } = credentials || {};
        if (!username || !password) return null;

        const res = await query('select * from users where username = $1', [username]);
        const user = res.rows[0];
        if (!user) return null;
        if (user.aktif === false) return null; // akun dinonaktifkan admin

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.nama_lengkap,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
});
