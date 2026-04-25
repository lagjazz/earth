import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * ModelCache — loads each GLB/GLTF model once, then returns clones.
 *
 * - Single HTTP request per unique model path.
 * - Geometries, materials, and textures are shared across instances.
 * - Animated models use SkeletonUtils.clone (preserves skinning/bones).
 * - Static models use scene.clone(true) (deep clone, safe for transforms).
 * - Callers receive a Promise so loading is async-friendly.
 */

class ModelCache {
  constructor() {
    this._cache = new Map();   // path -> { scene, hasAnimations, gltf }
    this._loader = new GLTFLoader();
  }

  /**
   * Get a model instance. First call loads; subsequent calls clone.
   *
   * @param {string} path  - URL/path to the .glb or .gltf file.
   * @returns {Promise<THREE.Group>}  Resolves to a ready-to-use scene graph.
   */
  async get(path) {
    // Already cached? Return a clone immediately.
    if (this._cache.has(path)) {
      return this._cloneCached(path);
    }

    // First load — store a promise so parallel callers share the same request.
    if (!this._cache.has(path)) {
      this._cache.set(path, this._loadOnce(path));
    }
    // Wait for the load to finish, then clone.
    await this._cache.get(path).ready;
    return this._cloneCached(path);
  }

  /**
   * Synchronous version for imperative code (callback-style).
   * Only call this *after* the model has been loaded via get() or preload().
   *
   * @param {string} path
   * @returns {THREE.Group | null}  Clone, or null if not yet loaded.
   */
  clone(path) {
    const entry = this._cache.get(path);
    if (!entry || !entry.ready) return null;
    return this._cloneCached(path);
  }

  /**
   * Preload a model without returning an instance.
   * Useful for eager-loading during app startup.
   *
   * @param {string} path
   * @returns {Promise<void>}
   */
  preload(path) {
    if (this._cache.has(path)) return Promise.resolve();
    this._cache.set(path, this._loadOnce(path));
    return this._cache.get(path).ready;
  }

  /**
   * Check if a model is already cached.
   */
  has(path) {
    const entry = this._cache.get(path);
    return entry && entry.ready !== undefined;
  }

  /**
   * Get cache stats (for debugging).
   */
  get stats() {
    const entries = [...this._cache.entries()]
      .filter(([, e]) => e.ready)
      .map(([path, entry]) => ({
        path,
        hasAnimations: entry.hasAnimations,
        instances: entry.instances || 0,
      }));
    return { totalModels: entries.length, entries };
  }

  // ─── Internal ───

  /**
   * Load a model once. Returns an entry object with a `ready` promise.
   */
  _loadOnce(path) {
    const readyPromise = new Promise((resolve, reject) => {
      this._loader.load(
        path,
        (gltf) => {
          const hasAnimations = gltf.animations && gltf.animations.length > 0;
          const entry = {
            scene: gltf.scene,
            hasAnimations,
            gltf,
            instances: 0,
            ready: Promise.resolve(),
          };
          this._cache.set(path, entry);
          console.log(`[ModelCache] Loaded: ${path} (${hasAnimations ? 'animated' : 'static'})`);
          resolve(entry);
        },
        (xhr) => {
          if (xhr.total) {
            const pct = ((xhr.loaded / xhr.total) * 100).toFixed(0);
            console.log(`[ModelCache] ${path}: ${pct}%`);
          }
        },
        (error) => {
          console.error(`[ModelCache] Failed to load: ${path}`, error);
          this._cache.delete(path);
          reject(error);
        }
      );
    });

    return { ready: readyPromise };
  }

  /**
   * Clone a cached model. Uses SkeletonUtils for animated models.
   */
  _cloneCached(path) {
    const entry = this._cache.get(path);
    if (!entry || !entry.ready) return null;

    let clone;
    if (entry.hasAnimations) {
      // Animated: deep-clone with bone/skin support.
      clone = cloneSkeleton(entry.scene);
    } else {
      // Static: standard deep clone.
      clone = entry.scene.clone(true);
    }

    entry.instances = (entry.instances || 0) + 1;
    return clone;
  }
}

// ─── Singleton ───
let _instance = null;

export function getModelCache() {
  if (!_instance) {
    _instance = new ModelCache();
  }
  return _instance;
}

export { ModelCache };
