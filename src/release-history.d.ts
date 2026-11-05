// Generated at build time by scripts/release-history.mjs.
declare module 'virtual:release-history' {
  const history: {
    version: string;
    commit: string;
    builtAt: string;
    totalUpdates: number;
    firstRelease: string;
    days: {
      date: string;
      items: { kind: 'new' | 'fix' | 'design' | 'improved' | 'security'; text: string }[];
    }[];
  };
  export default history;
}
