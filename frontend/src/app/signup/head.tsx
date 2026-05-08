import { SITE_URL } from '../../config/site';

export default function Head() {
  return (
    <>
      <title>Sign Up | Campus Reports</title>
      <link rel="canonical" href={`${SITE_URL}/signup`} />
    </>
  );
}
