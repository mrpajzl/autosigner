export default defineNitroPlugin(() => {
  if (!process.env.DATABASE_URL) {
    // Default to local SQLite database file under prisma/dev.db
    process.env.DATABASE_URL = 'file:./prisma/dev.db'
  }
})


