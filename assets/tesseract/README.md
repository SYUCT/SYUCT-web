# Tesseract.js browser assets

The timetable screenshot importer loads these files only after a user starts OCR. They are hosted by this static site so timetable images stay in the browser and the feature does not depend on a third-party CDN.

- `v7.0.0/tesseract.min.js` and `worker.min.js`: `tesseract.js@7.0.0`
- `v7.0.0/core/*-lstm.wasm.js`: `tesseract.js-core@7.0.0`; only the best core supported by the current browser is downloaded
- `v7.0.0/lang/chi_sim.traineddata.gz`: `@tesseract.js-data/chi_sim@1.0.0`, `4.0.0_best_int`

The matching upstream license files are kept beside the vendored files. To upgrade, add a new version directory and update `TESSERACT_VERSION` in `assets/timetable-ocr.js`; do not overwrite an existing immutable version directory.
