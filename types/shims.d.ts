// Add ambient module declarations for libraries without bundled types
declare module 'plist' {
  const defaultExport: {
    parse: (xml: string) => any
    build: (obj: any) => string
  }
  export = defaultExport
}

declare module 'formidable' {
  namespace formidableNS {
    interface File { filepath?: string; originalFilename?: string }
    interface Files { [key: string]: File | File[] }
    interface Fields { [key: string]: string | string[] | undefined | null }
  }
  const formidable: any
  export = formidable
}

declare module 'fs-extra' {
  const x: any
  export = x
}
