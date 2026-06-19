import * as path from 'path';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

/**
 * Resolve a user-supplied filename safely inside a fixed base directory.
 *
 * Mitigates path traversal (CWE-22) by:
 *   1. Stripping any directory separators from the user input.
 *   2. path.resolve()-ing the candidate so symlinks / ".." collapse.
 *   3. Asserting the resolved path is still inside the configured base.
 *   4. Optionally restricting to a whitelist of file extensions.
 *
 * The caller is still responsible for the actual fs read/write — this helper
 * never touches the filesystem. Wrap every user-controlled file access with it.
 */
export function safeJoin(
  baseDir: string,
  userFilename: string,
  options: { allowedExtensions?: readonly string[] } = {},
): string {
  if (typeof userFilename !== 'string' || userFilename.length === 0) {
    throw new BadRequestException('Filename is required.');
  }
  if (userFilename.length > 255) {
    throw new BadRequestException('Filename is too long.');
  }
  // Reject null bytes outright — Node will silently truncate these in some APIs.
  if (userFilename.includes('\0')) {
    throw new BadRequestException('Filename contains invalid characters.');
  }

  const base = path.resolve(baseDir);
  // basename() strips any "../" segments and slashes injected by the caller.
  const cleaned = path.basename(userFilename);
  const resolved = path.resolve(base, cleaned);

  // resolved must live under base — final separator guard avoids the
  // "/app/uploads" vs "/app/uploads-evil" false match.
  const baseWithSep = base.endsWith(path.sep) ? base : base + path.sep;
  if (resolved !== base && !resolved.startsWith(baseWithSep)) {
    throw new ForbiddenException('Path traversal attempt detected.');
  }

  if (options.allowedExtensions && options.allowedExtensions.length > 0) {
    const ext = path.extname(cleaned).toLowerCase();
    const allowed = options.allowedExtensions.map((e) => e.toLowerCase());
    if (!allowed.includes(ext)) {
      throw new BadRequestException(
        `File extension not allowed. Allowed: ${allowed.join(', ')}.`,
      );
    }
  }

  return resolved;
}
