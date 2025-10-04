# Classroom Mode Implementation Guide (Exchron)

Author: AI Assistant
Last Updated: 2025-10-04
Status: Draft Spec (authoritative for future feature work on classroom mode)

## 1. Purpose
Provide a precise, implementation-focused reference so an agent/dev can extend the existing Classroom UI (`/dashboard/classroom/*`) into a fully functional, client‑side, no‑code ML model builder—initially optimized for an Exoplanet Classification use case (binary / future multiclass). All computation stays in-browser (no server round‑trips). This spec bridges current UI shell to production‑ready logic.

## 2. Scope (Included vs Deferred)
| Category | Included (MVP + Near) | Deferred (Mark For Later) |
|----------|-----------------------|---------------------------|
| Data Input | CSV upload, schema inference, column typing, target selection, basic cleaning (remove empty rows, trim strings), missing value strategies (drop / mean / mode), normalization | Advanced feature engineering, automated outlier detection |
| Model Types | Logistic Regression (from scratch), Feedforward NN (tf.js), Simple Decision Tree (optional baseline) | Random Forest, Gradient Boosted Trees, AutoML architecture search |
| Training | Train/Validation split, basic metrics, progress UI, early stop heuristic | K-fold CV, Bayesian hyperparam tuning, GPU multi-model parallelism |
| Evaluation | Accuracy, Precision, Recall, F1, ROC AUC, Confusion Matrix, Class distribution, Threshold slider | SHAP values, Lift charts, Calibration plots |
| Inference/Test | Single row manual input form, batch test (upload test CSV), probability output, threshold application | Drift detection, batch monitoring dashboards |
| Export | Download: (a) JSON model artifact + metadata, (b) reproducible config, (c) simple inference snippet | ONNX export, WebAssembly compiled model bundle |
| Persistence | localStorage Project save/restore | IndexedDB versioning, multi-project workspace switcher |
| Performance | Mini-batching, Web Worker offload (training loop), typed arrays | WebGPU acceleration, streaming partial model checkpoints |
| Safety | Basic validation messages, front-end only guarantee note | Policy classification layer, PII scanning |

## 3. User Journey (Classroom Tabs)
1. Data Input → Load CSV, preview, define target column, confirm feature types, clean data.
2. Model Selection → Choose model family + core hyperparameters (or Auto Suggest). Shows complexity estimate.
3. Train & Validate → Start training, see live metrics, early stopping suggestion, overfit warning.
4. Test & Export → Run ad-hoc predictions, upload test set, adjust decision threshold, export model artifact.

All state flows forward; user can revisit prior tabs without losing progress (persist in `localStorage`).

## 4. Repository Integration Map
Existing pages:
- `src/app/dashboard/classroom/data-input/page.tsx`
- `src/app/dashboard/classroom/model-selection/page.tsx`
- `src/app/dashboard/classroom/train-validate/page.tsx`
- `src/app/dashboard/classroom/test-export/page.tsx`

Existing components (enhance rather than replace):
- `src/components/dashboard/classroom/datainput.tsx`
- `src/components/dashboard/classroom/modelselection.tsx`
- `src/components/dashboard/classroom/trainvalidate.tsx`
- `src/components/dashboard/classroom/testexport.tsx`

Add new supportive modules:
```
src/lib/ml/
  parsing/
    csv.ts              # Robust CSV → DataFrame-lite
  core/
    matrix.ts           # Minimal linear algebra helpers (if not using tf.js yet)
    math.ts             # Sigmoid, softmax, normalization utils
  models/
    logistic.ts         # Manual implementation (train/predict)
    neuralnet.ts        # tf.js wrapper
    decisiontree.ts     # Optional simple tree baseline
  pipeline/
    encoding.ts         # Categorical → one-hot / index
    split.ts            # Train/validation/test split logic
    metrics.ts          # Accuracy, precision, recall, f1, auc, confusion matrix
    evaluator.ts        # Aggregate evaluation run
    trainer.ts          # Orchestrates train based on chosen model type
  workers/
    trainer.worker.ts   # Offload heavy loops
state/
  classroomStore.ts     # Central reactive store (Zustand or custom) if needed
```

If keeping minimal dependencies, start with native + optional `@tensorflow/tfjs` for NN path only.

## 5. Data Structures (TypeScript Interfaces)
Define in `src/types/` (create if absent) or extend existing file:
```ts
export type ColumnType = 'numeric' | 'categorical' | 'boolean' | 'datetime' | 'text';

export interface RawDataset {
  name: string;
  originalCSV: string;
  rows: string[][]; // raw cells
  header: string[];
}

export interface InferredColumnMeta {
  name: string;
  index: number;
  inferredType: ColumnType;
  uniqueValues?: string[];
  min?: number; max?: number; mean?: number; std?: number; missingCount: number;
}

export interface PreparedDataset {
  features: Float32Array; // flattened (row-major)
  featureMatrixShape: { rows: number; cols: number };
  featureNames: string[];
  target: Float32Array; // encoded target (binary 0/1 or one-hot later)
  targetType: 'binary' | 'multiclass' | 'regression';
  encodingMap: Record<string, string[]>; // columnName -> category list
}

export interface ModelConfigBase {
  id: string;
  type: 'logistic' | 'neuralnet' | 'decision-tree';
  createdAt: number;
  hyperparams: Record<string, number | string | boolean>;
}

export interface TrainingRun {
  modelConfig: ModelConfigBase;
  datasetRef: string; // dataset id
  status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
  epochsPlanned?: number;
  epochMetrics: Array<{ epoch: number; loss: number; valLoss?: number; acc?: number; valAcc?: number }>;
  finalMetrics?: EvaluationSummary;
  startedAt?: number; finishedAt?: number; errorMessage?: string;
}

export interface EvaluationSummary {
  accuracy: number; precision: number; recall: number; f1: number;
  auc?: number; confusionMatrix: number[][]; classLabels: string[];
  threshold: number; // decision threshold used
}

export interface ExportArtifact {
  modelId: string;
  format: 'json-tfjs' | 'json-custom';
  blob: Blob;
  metadata: any;
}
```

## 6. Tab Responsibilities & Required Enhancements
### 6.1 Data Input Tab
UI Additions:
- File upload (CSV) with drag/drop + sample dataset button (re-use styling conventions: card layout).
- Preview table (first 50 rows) with per-column inferred type + dropdown override.
- Target column selector (locks once training begins unless user resets pipeline).
- Missing value handling strategy per column (auto default: numeric → mean; categorical → mode; drop if > X% missing).
- Normalization toggle (store decision in dataset metadata).

Logic Steps:
1. Parse CSV (stream if large; fallback full read for <20MB). Use custom or `Papa Parse` (if allowed) — MUST remain client side.
2. Infer types: numeric pattern, boolean (true/false / 0/1), categorical (<= 30 unique non-numeric tokens), datetime parse success rate.
3. Build `InferredColumnMeta[]` & persist in localStorage (`exchron.classroom.dataset.<hash>`).
4. On confirm → encode dataset:
   - Drop target from feature set.
   - Categorical: one-hot (future optimization: index + embedding for NN; not MVP).
   - Numeric: optional normalization (z-score or min-max choose one; specify in metadata).
5. Train/validation split (default 80/20 stratified if classification; store indices for reproducibility).

Edge Cases:
- Empty file / single column → show error.
- Mixed numeric w/ stray non-numeric tokens → coerce invalids to NaN then impute.
- Target with >15 classes → flag multiclass (defer advanced metrics if not implemented yet).

### 6.2 Model Selection Tab
UI Additions:
- Model cards: Logistic Regression (fast baseline), Neural Network (configurable layers), Decision Tree (if time).
- Hyperparameter accordion: learning rate, epochs, batch size, layer sizes, regularization L2, early stop patience.
- Complexity estimate pill (e.g., parameter count, expected seconds).
- Auto-Suggest button: chooses baseline config based on dataset size and feature count.

Logic:
- Generate `ModelConfigBase` with UUID.
- Validate hyperparams (ranges). Provide safe defaults.
- Store selected config into context state.

### 6.3 Train & Validate Tab
UI Additions:
- Start / Stop buttons.
- Live metric spark lines (loss & val loss). Accuracy running display.
- Overfit indicator: if `valLoss` increases 3 consecutive epochs while train loss decreases → show badge.
- Early stopping toggle (patience N epochs).

Logic Flow:
1. On Start → spawn Web Worker with serialized dataset + config OR run inline if small (<25k rows).
2. Training Loop API contract (postMessage events):
   - `init` → acknowledge
   - `epoch` → { epoch, loss, valLoss, acc, valAcc }
   - `complete` → { finalMetrics, weights }
   - `error` → { message }
3. Metrics computation in worker after each epoch (use validation subset only).
4. Early stop triggers `complete` with best epoch weights.
5. Persist `TrainingRun` snapshot every N epochs to localStorage (throttle).

Performance Considerations:
- Use Float32Array for feature matrix; slice batches by creating views (no copying).
- Mini-batch logistic regression: gradient descent w/ L2.
- Neural net: leverage `@tensorflow/tfjs` with `fit()`; intercept callbacks for metrics.

### 6.4 Test & Export Tab
UI Additions:
- Manual input form (auto-generated fields from featureNames; categorical → dropdown, numeric → number input). Show predicted class + probability.
- Threshold slider (0.0–1.0) updates confusion metrics (recomputed from stored validation predictions rather than retraining).
- Batch Test upload (optional): compute metrics vs provided file (must match schema; show mismatch report).
- Export section: buttons
  - Export Model (JSON + weights for logistic: weight vector + bias; NN: tf.js `model.save('downloads://...')`).
  - Export Metadata (dataset schema + preprocessing steps + threshold + metrics).
  - Copy Inference Snippet.

Logic:
- For logistic regression: store weights as arrays. Provide inference function `predict(featuresRow: number[]): number` returning probability.
- For NN: rely on tf.js `model.predict()`.
- Recompute confusion matrix when threshold changes using cached validation probabilities.

## 7. Exoplanet Classification Considerations
Target Domain Example (Kepler-like dataset): Imbalanced (few confirmed planets vs many non-planets). Actions:
- Show class ratio prominently after target select.
- Provide optional class weight calculation (inverse frequency) in training config (MVP for logistic + NN). Default: enabled if minority < 20%.
- Metrics emphasis: F1 + Recall; show guidance tooltip: “High recall important to avoid missing candidate planets.”
- Provide threshold tuning guidance: optimize F1 or Youden’s J statistic when user clicks “Auto Threshold.”

## 8. Overfitting & Guidance UX
Tooltips / helper banners (plain text, no heavy UI library):
- Data Input: “Ensure at least 50 positive samples for stable classification.”
- Model Selection: “Start with Logistic Regression for a quick baseline.”
- Train: “Validation loss rising while train loss falling indicates overfitting.”
- Test: “Adjust threshold to balance false positives vs. false negatives.”

## 9. State & Persistence Strategy
Key storage keys (prefix `exchron.classroom.`):
- `dataset.raw` → RawDataset serialized
- `dataset.prepared` → PreparedDataset (WITHOUT large Float32Arrays? Option: reconstruct on load; keep metadata only and rebuild arrays from raw)
- `model.config.current`
- `training.run.current`
- `validation.cache` → { probs: Float32Array serialized (Base64), labels: Uint8Array }
- `ui.activeTab` (optional)

Large binary arrays: serialize using `Array.from()` or Base64. Consider deferring persistence for >5MB.

## 10. Web Worker Contract (trainer.worker.ts)
Messages (type-safe):
```ts
// Main → Worker
{ type: 'start', payload: { modelConfig, dataset, trainingParams } }
{ type: 'stop' }

// Worker → Main
{ type: 'status', payload: { state: 'initializing' | 'running' } }
{ type: 'epoch', payload: { epoch, loss, valLoss, acc, valAcc } }
{ type: 'complete', payload: { finalMetrics, weights, history } }
{ type: 'error', payload: { message } }
```
Use transferable objects for large Float32Arrays to avoid copying (postMessage second arg). Maintain a clone in main thread before transfer.

## 11. Metrics Implementation Notes
- Confusion matrix: derive after final epoch & on threshold updates.
- AUC (ROC): For binary classification only; compute via trapezoidal integration over sorted probabilities.
- Precision/Recall arrays for potential PR curve (optional storage) — only if overhead minimal.

## 12. Validation & Error Handling
Return early with descriptive UI errors:
- “Target column cannot be all identical values.”
- “Feature matrix exceeds 100k rows × 200 columns (current safety cap).”
- “Uploaded evaluation file schema mismatch: missing columns: X.”

## 13. Performance Budget / Guardrails
| Aspect | Budget | Action if Exceeded |
|--------|--------|-------------------|
| Rows | 100,000 | Prompt to sample down (stratified) |
| Columns | 300 | Require manual reduction (uncheck features) |
| Training Epochs (LogReg) | 1,000 max | Hard cap; show warning |
| NN Parameters | 2,000,000 | Show complexity warning; require confirmation |

## 14. Accessibility & UX Notes
- All interactive elements keyboard navigable (tab order follows workflow).
- Provide `aria-live="polite"` region for training status updates.
- High contrast metrics; don’t rely solely on color (add badges, patterns optional).

## 15. Security & Privacy Statement Stub
Add inline note (Train Tab footer): “All computation occurs locally in your browser. No data leaves your device.”

## 16. Logging / Telemetry (Local Only MVP)
In-memory event log array (ring buffer size 200) for debugging:
```ts
interface UILogEvent { t: number; scope: string; msg: string; data?: any }
```
Expose optional download log button in Test & Export (JSON file). No remote transmission.

## 17. Export Artifact Formats
### 17.1 Logistic Regression (json-custom)
```json
{
  "modelType": "logistic",
  "version": 1,
  "weights": [ ... ],
  "bias": 0.123,
  "featureNames": [ ... ],
  "preprocessing": { "normalization": "zscore", "encodingMap": {"colA": ["X","Y"]} },
  "threshold": 0.42,
  "metrics": { "accuracy": 0.91, "f1": 0.78 }
}
```
### 17.2 Neural Net (json-tfjs)
Use `model.save('downloads://exchron-model')` + companion metadata JSON (same structure minus weights) zipped if feasible.

## 18. Inference Snippet (Logistic Example)
```js
function sigmoid(x){return 1/(1+Math.exp(-x));}
function predict(row, artifact){
  // row: raw numeric feature vector (already encoded + normalized)
  const z = artifact.weights.reduce((s,w,i)=> s + w*row[i], artifact.bias);
  const p = sigmoid(z);
  return { probability: p, label: p >= artifact.threshold ? 1 : 0 };
}
```

## 19. Implementation Phases & Task Breakdown
### Phase 1 (Infrastructure)
- Create `ml` directory modules (stubs + TODO comments).
- Implement CSV parse + type inference + dataset confirmation flow.
- Persist dataset & target selection.

### Phase 2 (Baseline Model & Training)
- Logistic regression gradient descent (mini-batch).
- Metrics & evaluation.
- Training UI progress.

### Phase 3 (Neural Net Integration)
- Add tf.js dependency.
- Build simple architecture (input → hidden (ReLU) → output (sigmoid/softmax)).
- Hook callbacks for metrics.

### Phase 4 (Test & Export)
- Manual inference form & threshold slider.
- Export artifact builder.
- Confusion matrix re-computation.

### Phase 5 (Exoplanet Enhancements)
- Class weights.
- Auto-threshold (maximize F1 on validation set).
- Guidance tooltips.

### Phase 6 (Refinement)
- Web Worker offload.
- Overfitting detection & early stopping.
- Performance safeguards.

## 20. Acceptance Criteria (Representative)
| Feature | Scenario | Expected |
|---------|----------|----------|
| CSV Upload | Valid file (header + rows) | Preview renders first 50 rows, types inferred |
| Target Selection | Choose categorical with 2 unique values | Target type set to binary |
| Training | Start logistic run | Epoch metrics stream until completion or stop |
| Overfitting Flag | valLoss rises 3 epochs while loss drops | Overfitting badge appears |
| Threshold Adjust | Slide from 0.5 to 0.7 | Confusion matrix + precision/recall update instantly |
| Export | Click Export Logistic | Download JSON with weights & metadata |
| Persistence | Refresh mid-training (after epoch 5) | Resume state reflects last persisted snapshot (or restarts gracefully) |

## 21. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Large dataset freezes UI | Web Worker + batching + yield via `requestAnimationFrame` |
| Memory bloat from multiple models | Limit stored training runs; clear old arrays on new run |
| User confusion on metrics | Inline tooltips + docs link placeholder |
| Floating point drift in logistic training | Use stable math (clip logits beyond ±20 before exp) |

## 22. Minimal Dependency Philosophy
Only add:
- `@tensorflow/tfjs` (gated; lazy import for NN usage)
Optional future: `papaparse` (else implement lightweight parser for MVP).

## 23. Style & Conventions Alignment
- Use existing light theme variables in `globals.css`.
- All new cards follow `Card` component wrappers.
- Place primary action bottom-right using `ActionButton` style (consistent with current patterns).

## 24. Extension Hooks (Future)
- Add AutoML pipeline injection point in `trainer.ts` (`strategy: 'manual' | 'auto'`).
- Add plugin registry for custom metrics (function signature `(preds: Float32Array, labels: Float32Array) => number`).

## 25. Open TODO Markers To Insert in Code
Use `// TODO(ClassroomSpec:#section)` referencing spec sections for traceability, e.g., `// TODO(ClassroomSpec:6.3) Implement early stopping logic`.

## 26. Deviation Handling
If implementation deviates (e.g., choose SVM baseline), append a new section `Revision Log` at bottom explaining rationale & date.

## 27. Glossary
- Artifact: Exportable bundle of model + preprocessing metadata.
- PreparedDataset: Numerical matrix ready for training.
- Threshold: Probability cutoff mapping to positive label.
- Class Weighting: Scaling loss contributions inversely to class frequency.

## 28. Immediate Next Steps (Actionable for Agent)
1. Scaffold `src/lib/ml` directory + placeholder modules.
2. Implement CSV parsing + type inference in Data Input component.
3. Add state persistence for dataset + target.
4. Implement logistic regression trainer + metrics inside worker (or inline first pass).
5. Wire Train & Validate UI to show live metrics.

---
This document is the canonical guide for Classroom mode evolution until superseded. Keep modifications append-only with a Revision Log.
