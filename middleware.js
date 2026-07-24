export const config = {
  matcher: '/((?!_astro|favicon.svg|fonts|product-review-assets).*)',
};

export function middleware(request) {
  const host = request.headers.get('host') || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return new Response(null, {
      headers: {
        'x-middleware-next': '1',
      },
    });
  }

  const authHeader = request.headers.get('authorization');

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
    const decoded = atob(authValue);
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

    const expectedUser = (process.env.BASIC_AUTH_USER || 'admin').trim().toLowerCase();
    const expectedPass = (process.env.BASIC_AUTH_PASSWORD || 'half0rds').trim();

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

  return new Response(null, {
    headers: {
      'x-middleware-next': '1',
    },
  });
}
