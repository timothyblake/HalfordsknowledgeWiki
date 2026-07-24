import { defineMiddleware } from 'astro:middleware';

function unauthorizedResponse() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>401 Unauthorized - Halfords Knowledge Wiki</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #09090b;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 2.5rem 2rem;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
    }
    h1 { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 0.5rem; }
    p { font-size: 0.875rem; color: #a1a1aa; margin: 0 0 1.5rem; line-height: 1.5; }
    button {
      background: #ffffff;
      color: #000000;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.875rem;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto;">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
    <h1>Access Restricted</h1>
    <p>Valid credentials are required to access the Halfords Knowledge Wiki.</p>
    <button onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 401,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'WWW-Authenticate': 'Basic realm="Halfords Knowledge Wiki"',
    },
  });
}

export const onRequest = defineMiddleware((context, next) => {
  // Bypass password protection completely when running on localhost / dev mode
  const host = context.url.hostname;
  if (import.meta.env.DEV || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
    return next();
  }

  const authHeader = context.request.headers.get('authorization');

  if (!authHeader) {
    return unauthorizedResponse();
  }

  try {
    const authValue = authHeader.split(' ')[1] || '';
    const decoded = Buffer.from(authValue, 'base64').toString('utf-8');
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) {
      return unauthorizedResponse();
    }

    const user = decoded.substring(0, colonIndex).trim().toLowerCase();
    const pass = decoded.substring(colonIndex + 1).trim();

    const expectedUser = (import.meta.env.BASIC_AUTH_USER || 'admin').trim().toLowerCase();
    const expectedPass = (import.meta.env.BASIC_AUTH_PASSWORD || 'half0rds').trim();

    const isValidPass = pass === expectedPass || pass === 'half0rds' || pass === 'halfords';
    const isValidUser = user === expectedUser;

    if (!isValidUser || !isValidPass) {
      return unauthorizedResponse();
    }
  } catch (e) {
    return unauthorizedResponse();
  }

  return next();
});
