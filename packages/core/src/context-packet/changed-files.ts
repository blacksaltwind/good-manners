export {
  isMeaningfulUiFile,
} from '../ui-files.js'

import {
  isMeaningfulUiFile,
} from '../ui-files.js'

export function filterMeaningfulUiFiles(
  files: string[],
): string[] {
  return [
    ...new Set(
      files.filter(
        isMeaningfulUiFile,
      ),
    ),
  ].sort()
}
