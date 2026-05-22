import { SITE_URL } from '../../config/site';

export default function Head() {
  return (
    <>
      <title>Campus Reports</title>
      <meta name="robots" content="noindex,follow" />
      <link rel="canonical" href={`${SITE_URL}/`} />
    </>
  );
}
