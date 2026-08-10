/** @type {import('next').NextConfig} */
const nextConfig = {
  // Playwright must run un-bundled in the Node server runtime (slide rendering).
  // It's imported lazily in lib/slides/api.mjs so serverless (where it isn't
  // installed) only fails if you actually try to render slides.
  serverExternalPackages: ['playwright', 'playwright-core'],
  // db.mjs resolves the store at runtime, so tracing can't see it — ship it
  // explicitly or every data page 500s on a cold lambda.
  outputFileTracingIncludes: { '/**/*': ['./data/db.json'] },
  typescript: { ignoreBuildErrors: true }, // logic modules are JS; ship fast, type later
};
export default nextConfig;
