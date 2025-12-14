import { execa } from 'execa'
import fse from 'fs-extra'
import path from 'node:path'
import os from 'node:os'

/**
 * Generate a 2048-bit RSA private key and a Certificate Signing Request (CSR)
 */
export async function generateCSR(commonName: string, email: string) {
  const tmpDir = os.tmpdir()
  const keyPath = path.join(tmpDir, `key-${Date.now()}.pem`)
  const csrPath = path.join(tmpDir, `csr-${Date.now()}.pem`)
  const cnfPath = path.join(tmpDir, `req-${Date.now()}.cnf`)

  // Create minimal OpenSSL config for CSR
  const configContent = `
[req]
distinguished_name = req_distinguished_name
prompt = no

[req_distinguished_name]
CN = ${commonName}
emailAddress = ${email}
  `.trim()

  try {
    await fse.writeFile(cnfPath, configContent)

    // Generate Key and CSR
    // openssl req -new -newkey rsa:2048 -nodes -keyout key.pem -out csr.pem -config req.cnf
    await execa('openssl', [
      'req', '-new',
      '-newkey', 'rsa:2048',
      '-nodes', // No password for the private key temporarily
      '-keyout', keyPath,
      '-out', csrPath,
      '-config', cnfPath
    ])

    const privateKey = await fse.readFile(keyPath, 'utf8')
    const csr = await fse.readFile(csrPath, 'utf8')

    return { privateKey, csr }
  } finally {
    // Cleanup
    await Promise.all([
      fse.remove(keyPath).catch(() => {}),
      fse.remove(csrPath).catch(() => {}),
      fse.remove(cnfPath).catch(() => {})
    ])
  }
}

/**
 * Combine a Private Key and a Certificate into a PKCS#12 (.p12) file
 */
export async function createP12(privateKey: string, certificate: string, password: string): Promise<Buffer> {
  const tmpDir = os.tmpdir()
  const keyPath = path.join(tmpDir, `p12-key-${Date.now()}.pem`)
  const certPath = path.join(tmpDir, `p12-cert-${Date.now()}.pem`)
  const p12Path = path.join(tmpDir, `out-${Date.now()}.p12`)

  try {
    // Write temp files
    await fse.writeFile(keyPath, privateKey)
    await fse.writeFile(certPath, certificate)

    // Check if openssl supports -legacy flag (OpenSSL 3.x does, LibreSSL doesn't)
    let useLegacy = false
    try {
      const { stdout } = await execa('openssl', ['version'])
      useLegacy = stdout.includes('OpenSSL 3') || stdout.includes('OpenSSL 1.1')
    } catch {}

    const args = [
      'pkcs12', '-export',
      '-inkey', keyPath,
      '-in', certPath,
      '-out', p12Path,
      '-passout', `pass:${password}`
    ]

    // Use legacy encryption to ensure maximum compatibility with Apple/macOS tools
    // often needed for newer OpenSSL versions
    if (useLegacy) args.push('-legacy')

    await execa('openssl', args)

    return await fse.readFile(p12Path)
  } finally {
    await Promise.all([
      fse.remove(keyPath).catch(() => {}),
      fse.remove(certPath).catch(() => {}),
      fse.remove(p12Path).catch(() => {})
    ])
  }
}
