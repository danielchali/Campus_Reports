import { SITE_URL } from '../../config/site';

export default function Head() {
  return (
    <>
      <title>Login | Campus Reports</title>
      <link rel="canonical" href={`${SITE_URL}/login`} />
    </>
  );
}
