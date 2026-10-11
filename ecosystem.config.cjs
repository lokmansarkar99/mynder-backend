module.exports = {
  apps: [
    {
      name: "mynder-api",
      cwd: "/home/lokman/projects/mynder-backend",
      script: "dist/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 5601,
      },
      autorestart: true,
      max_memory_restart: "400M",
      kill_timeout: 5000,
      time: true,
    },
  ],
};
