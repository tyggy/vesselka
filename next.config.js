/** @type {import('next').NextConfig} */

module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "www.marinetraffic.com",
      },
      {
        protocol: "https",
        hostname: "photos.marinetraffic.com",
      },
    ],
  },
}
