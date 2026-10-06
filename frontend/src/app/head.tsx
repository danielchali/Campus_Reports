import { SITE_URL } from '../config/site';

export default function Head() {
  const title = 'Campus Reports | Secure Campus Issue Reporting';
  const description =
    'Campus Reports helps students and staff submit secure incident and anonymous reports, track progress, and support safer campus operations.';
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Campus Reports',
    url: SITE_URL,
    description,
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/help?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="keywords"
        content="campus reports, kmu reports, kapasa makasa university, kmu campus safety, kmu campus report, incident reporting, anonymous report, university reporting, student discipline, security office"
      />
      <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Campus Reports" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:url" content={`${SITE_URL}/`} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${SITE_URL}/kmu_logo.png`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${SITE_URL}/kmu_logo.png`} />

      <link rel="canonical" href={`${SITE_URL}/`} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: structuredData,
        }}
      />
    </>
  );
}
