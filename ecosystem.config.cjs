module.exports = {
  apps: [
    {
      name: 'rakuten-room-researcher',
      script: 'npx',
      args: 'wrangler pages dev dist --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        RAKUTEN_APP_ID: 'c548f0ef-7728-4877-8058-0d94af2cc400',
        RAKUTEN_ACCESS_KEY: 'pk_KT2HeRAuNp6Y1USwzd3bavrPLEM4s8Smpr3i7j8Hf5U',
        RAKUTEN_AFFILIATE_ID: '50e2eb23.9e50225a.50e2eb24.5478fcf2'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
