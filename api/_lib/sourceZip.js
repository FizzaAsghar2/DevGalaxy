import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { deflateRawSync } from 'node:zlib'

/**
 * Builds a ZIP of the project source for Settings → Export. Only allow-listed
 * paths are included, secret-bearing files are always skipped, and any file
 * containing the value of a configured server secret is dropped as well.
 */
const INCLUDE_DIRS = ['src', 'api', 'public', 'supabase']
const INCLUDE_FILES = [
  'README.md', 'AGENTS.md', 'package.json', 'package-lock.json', 'index.html', 'vite.config.js', 'tailwind.config.js',
  'postcss.config.js', '.oxlintrc.json', 'vercel.json', '.env.example', '.gitignore',
]
const SKIP_NAMES = new Set(['node_modules', '.git', 'dist', 'dist-ssr', '.vercel', '.DS_Store', 'coverage', '.cache'])
const SKIP_PATTERNS = [/^\.env(\..*)?$/, /\.(pem|key|p12|pfx|log|dump|sqlite3?|db|bak)$/i, /\.sql\.gz$/i, /^id_(rsa|ed25519)/]
const SECRET_ENV = ['CLERK_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'AI_API_KEY', 'VITE_SUPABASE_ANON_KEY']

function skipped(name) {
  if (name === '.env.example') return false
  return SKIP_NAMES.has(name) || SKIP_PATTERNS.some((pattern) => pattern.test(name))
}

function walk(root, dir, out) {
  let entries
  try {
    entries = readdirSync(join(root, dir), { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (skipped(entry.name) || entry.isSymbolicLink()) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(root, path, out)
    else if (entry.isFile()) out.push(path)
  }
}

export function collectSourceFiles(root = process.cwd()) {
  const files = []
  for (const dir of INCLUDE_DIRS) walk(root, dir, files)
  for (const file of INCLUDE_FILES) {
    try {
      if (statSync(join(root, file)).isFile()) files.push(file)
    } catch {
      // optional file
    }
  }
  const secrets = SECRET_ENV.map((key) => process.env[key]).filter((value) => value && value.length >= 12)
  const result = []
  for (const file of files.sort()) {
    const data = readFileSync(join(root, file))
    if (secrets.length) {
      const text = data.toString('latin1')
      if (secrets.some((secret) => text.includes(secret))) {
        console.warn('export: skipped a file containing a configured secret:', file)
        continue
      }
    }
    result.push({ path: relative('.', file).split(sep).join('/'), data })
  }
  return result
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

/** Writes a standard (deflate, no ZIP64) archive with every file under `prefix/`. */
export function buildZip(files, prefix = 'devgalaxy') {
  const { time, day } = dosDateTime(new Date())
  const locals = []
  const centrals = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(`${prefix}/${file.path}`, 'utf8')
    const compressed = deflateRawSync(file.data, { level: 9 })
    const crc = crc32(file.data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(day, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(file.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    locals.push(local, name, compressed)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(0x031e, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt16LE(time, 12)
    central.writeUInt16LE(day, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(file.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)
    offset += local.length + name.length + compressed.length
  }
  const centralSize = centrals.reduce((sum, b) => sum + b.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, ...centrals, end])
}
