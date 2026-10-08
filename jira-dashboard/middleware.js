export const config = {
  matcher: '/:path*',
};

export default function middleware(request) {
  const basicAuth = request.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    const validUser = process.env.BASIC_AUTH_USER;
    const validPwd = process.env.BASIC_AUTH_PASSWORD;

    if (user === validUser && pwd === validPwd) {
      return;
    }
  }

  return new Response('Autenticazione richiesta', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Euronext PM Board"',
    },
  });
}
