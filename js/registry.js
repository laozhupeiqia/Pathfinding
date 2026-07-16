/**
 * Algorithm Registry
 *
 * To add a new algorithm:
 *   1. Create a file in js/algorithms/<name>.js
 *   2. Call AlgorithmRegistry.register('id', 'Display Name', generatorFn)
 *   3. Add the script tag to index.html
 *
 * The generator must yield { open: Set, closed: Set, path: null|[] }
 * and return the final state on completion.
 */
window.AlgorithmRegistry = {
  _algorithms: {},

  register(id, name, factoryFn) {
    this._algorithms[id] = { name, factoryFn };
  },

  get(id) {
    return this._algorithms[id]?.factoryFn;
  },

  getOptions() {
    return Object.entries(this._algorithms).map(([id, algo]) => ({
      id,
      name: algo.name,
    }));
  },
};
