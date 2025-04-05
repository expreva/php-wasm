import { test, is, ok, run } from 'testra'

run(async function () {
  for (const phpVersion of ['7.4', '8.4']) {
    const versionDash = phpVersion.replaceAll('.', '-')
    const versionUnderscore = phpVersion.replaceAll('.', '_')

    let result

    test(`PHP-WASM version ${phpVersion}`, async () => {
      result = await import(
        `/packages/web-${versionDash}/php-wasm-web-${versionDash}.min.js`
      )
      ok(true, 'dynamic import of web bundle')

      const globalName = `PhpWasm_${versionUnderscore}`
      const phpWasmBundle = window[globalName]

      ok(phpWasmBundle, globalName)

      const { PHP, loadPHPRuntime, getPHPLoaderModule } = phpWasmBundle

      ok(getPHPLoaderModule, 'has getPHPLoaderModule()')

      let wasmUrl
      let phpModule

      const options = {
        emscriptenOptions: {
          locateFile(path) {
            if (path.endsWith('.wasm')) {
              path = `/packages/web-${versionDash}/${path}`
            }
            // console.log('locateFile', path)
            return path
          },
        },
        onPhpLoaderModuleLoaded(loadedPhpModule) {
          wasmUrl = loadedPhpModule.dependencyFilename
          // console.log('phpModule', loadedPhpModule)
          phpModule = loadedPhpModule
        },
      }

      const phpLoaderModule = await getPHPLoaderModule(phpVersion)
      ok(phpLoaderModule, 'create PHP loader')

      options.onPhpLoaderModuleLoaded?.(phpLoaderModule)

      const php = new PHP(
        await loadPHPRuntime(phpLoaderModule, {
          ...(options.emscriptenOptions || {}),
          // ...websocketExtension,
        })
      )

      ok(php, 'Create PHP instance')

      let text = 'Hello, world'
      result = await php.run({
        code: `<?php echo "${text}";`,
      })

      ok(result, 'php.run')
      is(result.text, text, 'echo')
    })
  }
}).catch(console.error)
