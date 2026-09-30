import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/signup', '/anonymous-report', '/help'],
      disallow: [
        '/admin',
        '/warden-dashboard',
        '/chief-security-officer-dashboard',
        '/dean-of-students-dashboard',
        '/maintenance-dashboard',
        '/registrar-dashboard',
        '/secretary-dashboard',
        '/security-dashboard',
        '/student-dashboard',
        '/staff',
        '/students',
        '/cases',
        '/inbox',
        '/my-reports',
        '/audit',
        '/evidence',
        '/profile',
        '/settings',
        '/forgot-password',
        '/reset-password',
      ],
    },
    sitemap: 'https://campusreports.vercel.app/sitemap.xml',
  };
}
