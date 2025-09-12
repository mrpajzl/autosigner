// Add ambient module declarations for libraries without bundled types
declare module 'plist' {
  const x: any
  export = x
}
