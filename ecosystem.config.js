module.exports = {
  apps: [
    {
      name: 'uksf-site-preview',
      script: 'hugo server --port 8080 --bind 0.0.0.0 --disableFastRender',
      watch: ['content', 'layouts', 'data'],
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
