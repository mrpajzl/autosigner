// Add ambient module declarations for libraries without bundled types
declare module 'plist' {
  const defaultExport: {
    parse: (xml: string) => any
    build: (obj: any) => string
  }
  export = defaultExport
}
