import { createCell } from '../src/cell';
import simulation, { SimulationConfig } from '../src/simulation';

export function createTestSimulation(config: Partial<SimulationConfig> = {}) {
  return simulation({
    canvas: document.createElement('canvas'),
    cells: [createCell()],
    worldSize: { x: 1000, y: 1000 },
    behaviors: [],
    ...config,
  });
}
