export function middleware(request) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return new Response('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Halfords Wiki"' },
    });
  }

  try {
    const authValue = authHeader.split(' ')[1] || '';
    const [user, pass] = atob(authValue).split(':');

    const expectedUser = (process.env.BASIC_AUTH_USER || 'admin').trim().toLowerCase();
    const expectedPass = (process.env.BASIC_AUTH_PASSWORD || 'half0rds').trim();

    // Accept both 'half0rds' (number 0) and 'halfords' (letter o) for flexibility
    const isValidPass = pass === expectedPass || pass === 'half0rds' || pass === 'halfords';
    const isValidUser = user.toLowerCase() === expectedUser;

    if (!isValidUser || !isValidPass) {
      return new Response('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Halfords Wiki"' },
      });
    }
  } catch (e) {
    return new Response('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Halfords Wiki"' },
    });
  }
}
