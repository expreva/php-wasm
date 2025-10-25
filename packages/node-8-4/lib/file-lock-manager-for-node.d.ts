type NativeFlockSync = (fd: number, flags: 'sh' | 'ex' | 'shnb' | 'exnb' | 'un') => void;
import type { FileLockManager, RequestedRangeLock, WholeFileLock, WholeFileLockOp, Pid, Fd } from './file-lock-manager';
/**
 * This is the file lock manager for use within JS runtimes like Node.js.
 *
 * A FileLockManagerForNode is a wrapper around a Map of FileLock instances.
 * It provides methods for locking and unlocking files, as well as finding conflicting locks.
 */
export declare class FileLockManagerForNode implements FileLockManager {
    nativeFlockSync: NativeFlockSync;
    locks: Map<string, FileLock>;
    /**
     * Create a new FileLockManagerForNode instance.
     *
     * @param nativeFlockSync A synchronous flock() function to lock files via the host OS.
     */
    constructor(nativeFlockSync?: NativeFlockSync);
    /**
     * Lock the whole file.
     *
     * @param path The path to the file to lock. This should be the path
     *             of the file in the native filesystem.
     * @param op The whole file lock operation to perform.
     * @returns True if the lock was granted, false otherwise.
     */
    lockWholeFile(path: string, op: WholeFileLockOp): boolean;
    /**
     * Lock a byte range.
     *
     * @param path The path to the file to lock. This should be the path
     *             of the file in the native filesystem.
     * @param requestedLock The byte range lock to perform.
     * @returns True if the lock was granted, false otherwise.
     */
    lockFileByteRange(path: string, requestedLock: RequestedRangeLock): boolean;
    /**
     * Find the first conflicting byte range lock.
     *
     * @param path The path to the file to find the conflicting lock for.
     * @param desiredLock The desired byte range lock.
     * @returns The first conflicting byte range lock, or undefined if no conflicting lock exists.
     */
    findFirstConflictingByteRangeLock(path: string, desiredLock: RequestedRangeLock): Omit<RequestedRangeLock, 'fd'> | undefined;
    /**
     * Release all locks for the given process.
     *
     * @param pid The process ID to release locks for.
     */
    releaseLocksForProcess(pid: number): void;
    /**
     * Release all locks for the given process and file descriptor.
     *
     * @param pid The process ID to release locks for.
     * @param fd The file descriptor to release locks for.
     * @param path The path to the file to release locks for.
     */
    releaseLocksForProcessFd(pid: number, fd: number, nativePath: string): void;
    /**
     * Forget the path if it is unlocked.
     *
     * @param path The path to the file to forget.
     */
    private forgetPathIfUnlocked;
}
/**
 * A FileLock instance encapsulates a native whole-file lock and file locking between
 * php-wasm processes.
 *
 * A FileLock supports php-wasm whole-file locks and byte range locks.
 * Before granting a php-wasm lock, a FileLock ensures that it first holds a compatible
 * native lock. If a compatible native lock cannot be acquired, the php-wasm lock is
 * not granted.
 */
export declare class FileLock {
    /**
     * Create a new FileLock instance for the given file and mode.
     * Fail if the underlying native file lock cannot be acquired.
     *
     * @param path The path to the file to lock
     * @param mode The type of lock to acquire
     * @returns A FileLock instance if the lock was acquired, undefined otherwise
     */
    static maybeCreate(path: string, mode: Exclude<WholeFileLock['type'], 'unlocked'>, nativeFlockSync: NativeFlockSync): FileLock | undefined;
    private nativeLock;
    private wholeFileLock;
    private rangeLocks;
    private constructor();
    /**
     * Close the file descriptor and release the native lock.
     *
     * @TODO Replace this with a Symbol.dispose property once supported by all JS runtimes.
     */
    dispose(): void;
    /**
     * Lock the whole file.
     *
     * This method corresponds to the flock() function.
     *
     * @param op The whole file lock operation to perform.
     * @returns True if the lock was granted, false otherwise.
     */
    lockWholeFile(op: WholeFileLockOp): boolean;
    /**
     * Lock a byte range.
     *
     * This method corresponds to the fcntl() F_SETLK command.
     *
     * @param requestedLock The byte range lock to perform.
     * @returns True if the lock was granted, false otherwise.
     */
    lockFileByteRange(requestedLock: RequestedRangeLock): boolean;
    /**
     * Find the first conflicting byte range lock.
     *
     * This method corresponds to the fcntl() F_GETLK command.
     *
     * @param desiredLock The desired byte range lock.
     * @returns The first conflicting byte range lock, or undefined if no conflicting lock exists.
     */
    findFirstConflictingByteRangeLock(desiredLock: RequestedRangeLock): RequestedRangeLock | undefined;
    /**
     * Release all locks for the given process.
     *
     * @param pid The process ID to release locks for.
     */
    releaseLocksForProcess(pid: Pid): void;
    /**
     * Release all locks for the given process and file descriptor.
     *
     * @param pid The process ID to release locks for.
     * @param fd The file descriptor to release locks for.
     */
    releaseLocksForProcessFd(pid: Pid, fd: Fd): void;
    /**
     * Check if the file lock is unlocked.
     *
     * @returns True if the file lock is unlocked, false otherwise.
     */
    isUnlocked(): boolean;
    /**
     * Ensure that the native lock is compatible with the php-wasm lock,
     * upgrading or downgrading as needed.
     *
     * @param overrideWholeFileLockType If provided, use this type for the whole file lock.
     * @param overrideRangeLockType If provided, use this type for the range lock.
     * @returns True if the native lock was upgraded or downgraded, false otherwise.
     */
    private ensureCompatibleNativeLock;
    /**
     * Check if a lock exists that conflicts with the requested range lock.
     *
     * @param requestedLock The desired byte range lock.
     * @returns True if a conflicting lock exists, false otherwise.
     */
    private isThereAConflictWithRequestedRangeLock;
    /**
     * Check if a lock exists that conflicts with the requested whole-file lock.
     *
     * @param requestedLock The desired whole-file lock.
     * @returns True if a conflicting lock exists, false otherwise.
     */
    private isThereAConflictWithRequestedWholeFileLock;
}
export {};
