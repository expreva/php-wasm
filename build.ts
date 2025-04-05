import esbuild, { type BuildOptions as EsbuildOptions } from 'esbuild'
import { $, fs, glob, path } from 'zx'
import { SupportedPHPVersions } from '@php-wasm/universal'
import { rollup, type InputOptions, type OutputOptions } from 'rollup'
import { terser } from 'rollup-plugin-terser'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonJsPlugin from '@rollup/plugin-commonjs'
import { excludeVersions } from './common.ts'

const cwd = process.cwd()
const packagesPath = path.join(cwd, 'packages')

const rollupPlugins = [
  commonJsPlugin(),
  nodeResolve({
    browser: true,
  }),
  terser(),
]

async function buildRollup(
  inputOptions: InputOptions,
  outputOptions: OutputOptions
) {
  let bundle
  let buildFailed = false
  try {
    bundle = await rollup(inputOptions)
    await bundle.write(outputOptions)
  } catch (e) {
    buildFailed = true
    console.error(e)
  }
  if (bundle) await bundle.close()
  if (buildFailed) process.exit(1)
}

const target = process.argv.slice(2)[0] || 'all'

switch (target) {
  case 'all':
    await buildPackages()
    await buildTestsWeb()
    break
  case 'packages':
    await buildPackages()
    break
  case 'web':
    await buildTestsWeb()
    break
  case 'release':
    await releasePackages({})
    break
  case 'release:dry-run':
    await releasePackages(false)
    break
}

async function releasePackages(
  props: {
    dryRun?: boolean
    force?: boolean
  } = {}
) {
  const { dryRun = false, force = false } = props
  for (const phpWasmType of ['node', 'web']) {
    for (const phpVersion of SupportedPHPVersions) {
      if (excludeVersions.includes(phpVersion)) continue

      const versionDash = phpVersion.replaceAll('.', '-')

      const folderName = `${phpWasmType}-${versionDash}`
      const folderPath = path.join(packagesPath, folderName)

      console.log('Release package', folderName)
      console.log('From folder', folderPath)
      console.log()

      $.cwd = folderPath

      const { name: packageName, version: packageVersion } = await fs.readJson(
        path.join(folderPath, 'package.json')
      )

      console.log('Check if version already exists')
      try {
        const info = JSON.parse((await $`curl -s https://registry.npmjs.org/${packageName}`).stdout)
        if (info.versions && info.versions[packageVersion]) {
          console.log('This version already published', packageVersion)
          continue
        } else {
          console.log('OK - Not published yet')
        }
      } catch (e) {
        // No versions
      }
      if (dryRun) {
        await $`npm publish --access public --dry-run`.verbose()
      } else {
        try {
          await $`npm publish --access public --otp=${process.env.OTP}`.verbose()
        } catch (e) {
          if (!force) {
            throw e
          }
          // Continue
          console.log(e.message)
        }
      }
    }
  }
}

async function buildPackages() {
  for (const phpWasmType of ['node', 'web']) {
    const srcDirPath = path.join(cwd, 'node_modules', '@php-wasm', phpWasmType)

    await fs.copy(
      path.join(srcDirPath, 'package.json'),
      `package-${phpWasmType}-original.json`
    )

    const packageTemplateJson = await fs.readJson(
      `package-${phpWasmType}-template.json`
    )

    for (const version of SupportedPHPVersions) {
      if (excludeVersions.includes(version)) continue

      const versionDash = version.replaceAll('.', '-')
      const versionUnderscore = version.replaceAll('.', '_')
      const folderName = `${phpWasmType}-${versionDash}`
      const folderPath = path.join(packagesPath, folderName)

      console.log('Create', folderName)
      console.log()

      if (await fs.exists(folderPath)) {
        await fs.rm(folderPath, {
          recursive: true,
          force: true,
        })
      }
      await fs.ensureDir(folderPath)

      const files = await glob(
        [
          'index.js',
          'index.js.map',
          'index.d.ts',
          'lib/**/*',
          'LICENSE',
          'README.md',

          `asyncify/php_${versionUnderscore}.js`,
          `asyncify/${versionUnderscore}*/**/*`,
          `jspi/php_${versionUnderscore}.js`,
          `jspi/${versionUnderscore}*/**/*`,

          `php/asyncify/php_${versionUnderscore}.js`,
          `php/asyncify/${versionUnderscore}*/*.wasm`,
          `php/jspi/php_${versionUnderscore}.js`,
          `php/jspi/${versionUnderscore}*/**/*`,
        ],
        {
          cwd: srcDirPath,
        }
      )

      for (const file of files) {
        console.log(file)
        const srcFilePath = path.join(srcDirPath, file)
        const targetFilePath = path.join(folderPath, file)
        const targetDir = path.dirname(targetFilePath)
        await fs.ensureDir(targetDir)
        await fs.copy(srcFilePath, targetFilePath)

        /**
         * HACK: Patch import/export statements that expect to be bundled
         */
        if (phpWasmType === 'node') {
          if (file === `index.js`) {
            await fs.writeFile(
              targetFilePath,
              (await fs.readFile(targetFilePath, 'utf8')) +
                `\nexport * from "@php-wasm/universal";\n`
            )
          }
        } else if (phpWasmType === 'web') {
          if (file === `index.js`) {
            await fs.writeFile(
              targetFilePath,
              (await fs.readFile(targetFilePath, 'utf8')) +
                `\nexport * from "@php-wasm/universal";\n`
            )
          } else if (file === `php/asyncify/php_${versionUnderscore}.js`) {
            await fs.writeFile(
              targetFilePath,
              (await fs.readFile(targetFilePath, 'utf8')).replace(
                `import dependencyFilename from './`,
                `const dependencyFilename = './php/asyncify/`
              )
            )
          } else if (file === `php/jspi/php_${versionUnderscore}.js`) {
            await fs.writeFile(
              targetFilePath,
              (await fs.readFile(targetFilePath, 'utf8')).replace(
                `import dependencyFilename from './`,
                `const dependencyFilename = './php/jspi/`
              )
            )
          }
        }
      }

      const name = `@expreva/php-wasm${
        phpWasmType === 'node' ? '' : '-web'
      }-${versionDash}`
      await fs.writeJson(
        path.join(folderPath, 'package.json'),
        {
          ...packageTemplateJson,
          name,
        },
        {
          spaces: 2,
        }
      )
      console.log('Prepared package:', name)
      console.log()

      /**
       * Web build
       * @see https://rollupjs.org/javascript-api/
       */

      if (phpWasmType === 'web') {
        const input = path.join(folderPath, 'index.js')
        const targetFolderPath = folderPath
        const file = path.join(
          targetFolderPath,
          `php-wasm-${phpWasmType}-${versionDash}.min.js`
        )

        console.log('Bundle for web', path.relative(cwd, input))

        const inputOptions: InputOptions = {
          input,
          plugins: rollupPlugins,
          external: [/\.\/php/],
        }
        const outputOptions: OutputOptions = {
          entryFileNames: input,
          file,
          name: `PhpWasm_${versionUnderscore}`,
          format: 'umd',
          indent: false,
          sourcemap: true,
        }

        await buildRollup(inputOptions, outputOptions)

        console.log('Built', path.relative(cwd, file))
        console.log()
      }

      // break // For dev/debug, build a single version
    } // Every version
  } // node and web
}

async function buildTestsWeb() {
  const input = 'tests/web.ts'
  const output = 'tests/web.build.js'

  const esbuildOptions: EsbuildOptions = {
    entryPoints: [input],
    outfile: output,
    assetNames: '',
    format: 'iife',
    platform: 'browser',
    logLevel: 'info',
    bundle: true,
    minify: true,
    sourcemap: true,
    jsx: 'automatic',
    external: ['../packages/*', './php/*'],
  }

  const context = await esbuild.context(esbuildOptions)
  await context.rebuild()
  await context.dispose()

  console.log('Built', output)
}
