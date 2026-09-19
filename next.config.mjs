/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async headers() {
    // Apply and candidate URLs carry tokens; never leak them through Referer.
    return [{ source: "/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] }];
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/applicants",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
