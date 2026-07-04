export interface Coordinate { r: number; c: number }

export const TRACK_COORDINATES: Record<number, Coordinate> = {
  0: { r: 6, c: 1 }, 1: { r: 6, c: 2 }, 2: { r: 6, c: 3 }, 3: { r: 6, c: 4 }, 4: { r: 6, c: 5 },
  5: { r: 5, c: 6 }, 6: { r: 4, c: 6 }, 7: { r: 3, c: 6 }, 8: { r: 2, c: 6 }, 9: { r: 1, c: 6 }, 10: { r: 0, c: 6 },
  11: { r: 0, c: 7 },
  12: { r: 0, c: 8 }, 13: { r: 1, c: 8 }, 14: { r: 2, c: 8 }, 15: { r: 3, c: 8 }, 16: { r: 4, c: 8 }, 17: { r: 5, c: 8 },
  18: { r: 6, c: 9 }, 19: { r: 6, c: 10 }, 20: { r: 6, c: 11 }, 21: { r: 6, c: 12 }, 22: { r: 6, c: 13 }, 23: { r: 6, c: 14 },
  24: { r: 7, c: 14 },
  25: { r: 8, c: 14 }, 26: { r: 8, c: 13 }, 27: { r: 8, c: 12 }, 28: { r: 8, c: 11 }, 29: { r: 8, c: 10 }, 30: { r: 8, c: 9 },
  31: { r: 9, c: 8 }, 32: { r: 10, c: 8 }, 33: { r: 11, c: 8 }, 34: { r: 12, c: 8 }, 35: { r: 13, c: 8 }, 36: { r: 14, c: 8 },
  37: { r: 14, c: 7 },
  38: { r: 14, c: 6 }, 39: { r: 13, c: 6 }, 40: { r: 12, c: 6 }, 41: { r: 11, c: 6 }, 42: { r: 10, c: 6 }, 43: { r: 9, c: 6 },
  44: { r: 8, c: 5 }, 45: { r: 8, c: 4 }, 46: { r: 8, c: 3 }, 47: { r: 8, c: 2 }, 48: { r: 8, c: 1 }, 49: { r: 8, c: 0 },
  50: { r: 7, c: 0 }
};

export const HOST_HOME_STRETCH: Record<number, Coordinate> = {
  51: { r: 7, c: 1 }, 52: { r: 7, c: 2 }, 53: { r: 7, c: 3 }, 54: { r: 7, c: 4 }, 55: { r: 7, c: 5 }
};

export const GUEST_HOME_STRETCH: Record<number, Coordinate> = {
  51: { r: 7, c: 13 }, 52: { r: 7, c: 12 }, 53: { r: 7, c: 11 }, 54: { r: 7, c: 10 }, 55: { r: 7, c: 9 }
};

export const HOST_GOAL_CELL = { r: 7, c: 6 };
export const GUEST_GOAL_CELL = { r: 7, c: 8 };
