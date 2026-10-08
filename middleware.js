import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

// REVISI: export default (bukan named "middleware") supaya Next.js pasti
// mengenalinya sebagai fungsi middleware yang valid.
const { auth } = NextAuth(authConfig);
export default auth;

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
};
