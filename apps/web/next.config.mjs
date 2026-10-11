/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fija el root del workspace al monorepo NutriFlow.
  // Sin esto Next infiere E:\nuevo (hay varios lockfiles) y escanea todo el disco.
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname.replace(/\\/g, '/'),
};
export default nextConfig;
