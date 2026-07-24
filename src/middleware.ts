import { defineMiddleware } from 'astro:middleware';

function isValidAuth(authHeader: string | null): boolean {
  if (!authHeader) return false;

  // Header format: "Basic base64(user:pass)"
  const authValue = authHeader.split(' ')[1];
  if (!authValue) return false;

  const [user, pass] = atob(authValue).split(':');

  // Fetch expected credentials from Environment Variables
  const expectedUser = import.meta.env.BASIC_AUTH_USER || 'admin';
  const expectedPass = import.meta.env.BASIC_AUTH_PASSWORD || 'half0rds';

  return user === expectedUser && pass === expectedPass;
}

export const onRequest = defineMiddleware((context, next) => {
  const authHeader = context.request.headers.get('authorization');

  if (!isValidAuth(authHeader)) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Protected Site"',
      },
    });
  }

  return next();
});
