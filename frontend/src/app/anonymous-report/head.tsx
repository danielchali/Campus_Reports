import { SITE_URL } from '../../config/site';

export default function Head() {
  return (
    <>
      <title>Anonymous Report | Campus Reports</title>
      <link rel="canonical" href={`${SITE_URL}/anonymous-report`} />
    </>
  );
}
