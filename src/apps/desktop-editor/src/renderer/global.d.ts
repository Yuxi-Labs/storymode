export {};
declare global {
  interface Window {
    storymodeAPI?: {
      onMenu(handler: (payload: any) => void): void;
    };
  }
}