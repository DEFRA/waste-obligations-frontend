import path from 'node:path'

/**
 * @param {object} options
 * @param {boolean} options.isDevelopment
 * @param {string} options.certsDir
 * @param {Pick<import('node:fs'), 'existsSync' | 'readFileSync'>} options.fs
 * @returns {import('@hapi/hapi').ServerOptions['tls'] | undefined}
 */
export function getDevelopmentTls({ isDevelopment, certsDir, fs }) {
  const keyPath = path.join(certsDir, 'localhost-key.pem')

  if (!isDevelopment || !fs.existsSync(keyPath)) {
    return undefined
  }

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(path.join(certsDir, 'localhost-cert.pem'))
  }
}
