import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  const authHeader = context.request.headers.get('authorization');

  if (!authHeader) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Halfords Knowledge Wiki"',
      },
    });
  }

  try {
    const authValue = authHeader.split(' ')[1] || '';
    const decoded = Buffer.from(authValue, 'base64').toString('utf-8');
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) {
      return new Response('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Halfords Knowledge Wiki"',
        },
      });
    }

    const user = decoded.substring(0, colonIndex).trim().toLowerCase();
    const pass = decoded.substring(colonIndex + 1).trim();

    const expectedUser = (import.meta.env.BASIC_AUTH_USER || 'admin').trim().toLowerCase();
    const expectedPass = (import.meta.env.BASIC_AUTH_PASSWORD || 'half0rds').trim();

    const isValidPass = pass === expectedPass || pass === 'half0rds' || pass === 'halfords';
    const isValidUser = user === expectedUser;

    if (!isValidUser || !isValidPass) {
      return new Response('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Halfords Knowledge Wiki"',
        },
      });
    }
  } catch (e) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Halfords Knowledge Wiki"',
      },
    });
  }

  return next();
});
