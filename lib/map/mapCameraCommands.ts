export type MapCameraSnapshot = {
  pitch: number;
  bearing: number;
  zoom: number;
};

export type MapCameraCommands = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetNorth: () => void;
  pitchUp: () => void;
  pitchDown: () => void;
  isReady: () => boolean;
};
