import type { SupportedPHPVersion, EmscriptenOptions, RemoteAPI } from '@php-wasm/universal';
import type { FileLockManager } from './file-lock-manager';
import type { Promised } from '@php-wasm/util';
export interface PHPLoaderOptions {
    emscriptenOptions?: EmscriptenOptions;
    followSymlinks?: boolean;
    withXdebug?: boolean;
    withIntl?: boolean;
}
type PHPLoaderOptionsForNode = PHPLoaderOptions & {
    emscriptenOptions?: EmscriptenOptions & {
        /**
         * The process ID for the PHP runtime.
         *
         * This is used to distinguish between php-wasm processes for the
         * purpose of file locking and more informative trace messages.
         *
         * This ID is optional when running a single php-wasm process.
         */
        processId?: number;
        /**
         * An optional file lock manager to use for the PHP runtime.
         *
         * The lock manager is optional when running a single php-wasm process.
         *
         * When running with JSPI, both synchronous and asynchronous
         * file lock managers are supported.
         * When running with Asyncify, the file lock manager must be synchronous.
         */
        fileLockManager?: RemoteAPI<FileLockManager> | Promised<FileLockManager> | FileLockManager;
        /**
         * An optional function to collect trace messages.
         *
         * @param processId - The process ID of the PHP runtime.
         * @param format - A printf-style format string.
         * @param args - Arguments to the format string.
         */
        trace?: (processId: number, format: string, ...args: any[]) => void;
        /**
         * An optional object to pass to the PHP-WASM library's `init` function.
         *
         * phpWasmInitOptions.nativeInternalDirPath is used to mount a
         * real, native directory as the php-wasm /internal directory.
         *
         * @see https://github.com/php-wasm/php-wasm/blob/main/compile/php/phpwasm-emscripten-library.js#L100
         */
        phpWasmInitOptions?: {
            nativeInternalDirPath?: string;
        };
    };
};
/**
 * Does what load() does, but synchronously returns
 * an object with the PHP instance and a promise that
 * resolves when the PHP instance is ready.
 *
 * @see load
 */
export declare function loadNodeRuntime(phpVersion: SupportedPHPVersion, options?: PHPLoaderOptionsForNode): Promise<number>;
export {};
