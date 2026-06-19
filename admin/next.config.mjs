/** @type {import('next').NextConfig} */
const nextConfig = {
  // Playwright must run un-bundled in the Node server runtime (slide rendering).
  serverExternalPackages: ['playwright', 'playwright-core'],
  typescript: { ignoreBuildErrors: true }, // logic modules are JS; ship fast, type later
};
export default nextConfig;
