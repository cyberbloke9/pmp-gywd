/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    GYWD_GLOBAL_DIR: process.env.GYWD_GLOBAL_DIR || '',
    GYWD_PLANNING_DIR: process.env.GYWD_PLANNING_DIR || '',
  },
};

export default nextConfig;
