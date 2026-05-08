import { SITE_URL } from '../../config/site';

export default function Head() {
  return (
    <>
      <title>Help | Campus Reports</title>
      <link rel="canonical" href={`${SITE_URL}/help`} />
    </>
  );
}
