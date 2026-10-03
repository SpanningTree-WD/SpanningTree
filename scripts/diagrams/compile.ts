import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
export const ENGINE = 'sandbox-v1'
export const IMAGE = 'spanning-tree-diagrams:' + ENGINE
export function sourceHash(language: string, source: string) {
  return createHash('sha256').update(ENGINE + '\n' + language + '\n' + source.replace(/\r\n/g, '\n').trim()).digest('hex')
}
export function validateDiagram(language: string, source: string) {
  if (!['tikz', 'asymptote'].includes(language) || typeof source !== 'string' || !source.trim() || source.length > 20000)
    throw new Error('도형 언어와 소스 길이(20,000자 이하)를 확인해 주세요.')
}
async function removeTemporaryDirectory(directory: string) {
  const resolved = resolve(directory)
  if (!resolved.startsWith(resolve(tmpdir()) + (process.platform === 'win32' ? '\\' : '/')) || !resolved.includes('spanning-diagram-')) throw new Error('Unsafe cleanup path')
  await rm(resolved, { recursive: true, force: true })
}
export async function compileDiagram(language: string, source: string): Promise<Buffer> {
  validateDiagram(language, source)
  const directory = await mkdtemp(join(tmpdir(), 'spanning-diagram-'))
  const name = 'diagram-' + randomUUID()
  try {
    await chmod(directory, 0o755)
    await writeFile(join(directory, 'source'), source, { mode: 0o444 })
    const result = spawnSync('docker', [
      'run', '--rm', '--name', name, '--network', 'none', '--read-only',
      '--memory', '512m', '--memory-swap', '512m', '--cpus', '1', '--pids-limit', '64',
      '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
      '--ulimit', 'fsize=16777216:16777216', '--ulimit', 'nofile=128:128',
      '--user', '65534:65534',
      '--tmpfs', '/work:rw,nosuid,nodev,noexec,size=96m,uid=65534,gid=65534',
      '--tmpfs', '/tmp:rw,nosuid,nodev,noexec,size=32m,uid=65534,gid=65534',
      '--mount', 'type=bind,src=' + resolve(directory) + ',dst=/input,readonly',
      IMAGE, language,
    ], { timeout: 30000, killSignal: 'SIGKILL', maxBuffer: 8 * 1024 * 1024, encoding: 'buffer' })
    if (result.error || result.status !== 0) {
      const diagnostic = result.stderr?.toString('utf8').slice(-5000) || result.error?.message || 'Compilation failed.'
      throw new Error('도형 컴파일 실패 (실행 제한: 25초 / 메모리: 512MB).\n' + diagnostic)
    }
    const png = result.stdout
    if (!png || png.length < 24 || png.length > 8 * 1024 * 1024 ||
      !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      png.readUInt32BE(16) > 2048 || png.readUInt32BE(20) > 2048)
      throw new Error('도형 결과의 형식 또는 크기를 확인해 주세요.')
    return png
  } finally {
    // Kill the named container even if the client timed out; source/temp files are task-local.
    spawnSync('docker', ['rm', '--force', name], { timeout: 5000, stdio: 'ignore' })
    await removeTemporaryDirectory(directory)
  }
}
