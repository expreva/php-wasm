import { test, is, ok, run } from 'testra'
import { fs, path } from 'zx'
// https://wordpress.github.io/wordpress-playground/api/universal
import { PHP, SupportedPHPVersions } from '@php-wasm/universal'
import { excludeVersions } from '../common.ts'

const currentScriptName = path.basename(__filename)

run(async () => {
  const testsDir = path.join(process.cwd(), 'tests')

  for (const version of SupportedPHPVersions) {
    if (excludeVersions.includes(version)) continue

    const versionDash = version.replaceAll('.', '-')

    test(`PHP version ${version}`, async () => {
      const folderName = `packages/node-${versionDash}`
      is(true, await fs.exists(folderName), 'folder exists')

      let result = await import(`../${folderName}`)

      ok(result, 'import it')
      // console.log(result)

      const {
        createNodeFsMountHandler,
        getPHPLoaderModule,
        loadNodeRuntime,
        useHostFilesystem, // This mounts the user file system from root /
        withNetworking,
      } = result

      ok(createNodeFsMountHandler, 'file system handler')
      ok(loadNodeRuntime, 'node runtime loader')

      const { TMPDIR, ...envVariables } = process.env
      const php = new PHP(
        await loadNodeRuntime(version, {
          emscriptenOptions: {
            ENV: {
              ...envVariables,
              TERM: 'xterm',
            },
          },
        })
      )

      ok(php, 'create PHP instance')

      const text = `Hello world!`

      result = await php.run({
        code: `<?php echo "${text}";`,
      })

      // console.log(result)

      is(result.text, text, 'run echo')

      // File system

      const vfsPath = '/var/www/html'

      php.mkdir(vfsPath) // Necessary before mounting, even if directory exists
      ok(php, `create directory in virtual file system`)

      const unmount = await php.mount(
        vfsPath,
        createNodeFsMountHandler(testsDir)
      )
      ok(php, `mount tests directory to ${vfsPath}`)

      const files = php.listFiles(vfsPath)
      ok(files.includes(currentScriptName), `file exists: ${currentScriptName}`)

      await unmount()
      ok(true, 'unmount')

      php.exit()
      ok(php, 'exit')
    })
  }
})
