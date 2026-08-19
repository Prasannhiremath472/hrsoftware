/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');

/**
 * ============================================================================
 * MANTRA SDK BINDING — THE ONLY FILE THAT TOUCHES THE NATIVE DLL
 * ============================================================================
 *
 * Everything else in this agent is SDK-agnostic. All vendor-specific detail is
 * isolated here so that when the real SDK package arrives, only this file needs
 * to change.
 *
 * !! THE FUNCTION SIGNATURES BELOW ARE PLACEHOLDERS !!
 *
 * They are modelled on Mantra's commonly-documented MFS100/MFS110 SDK shape,
 * but the real exported symbol names, argument order, struct layouts and return
 * codes MUST be confirmed against the SDK package you receive from Mantra
 * (check its header files, C#/VB samples, and integration guide). Do not assume
 * these are correct — verify each one, then update SDK_SIGNATURES below.
 *
 * If the SDK ships a C# sample instead of a C header, the sample's DllImport
 * declarations are the authoritative source for these signatures.
 *
 * WHAT TO CONFIRM WITH THE SDK DOCS:
 *   1. DLL filename (MFS100.dll? MantraSDK.dll? something else)
 *   2. Init/Uninit function names and whether Init takes a licence key
 *   3. Capture function: does it block? what timeout arg? what quality arg?
 *   4. Template extraction: separate call, or returned by capture?
 *   5. Template format: ISO 19794-2 / ANSI-378 / proprietary, and its byte size
 *   6. Match function: does the SDK provide one, and what score range?
 *   7. Return-code meanings (0 = success is typical but confirm)
 */

// ---------------------------------------------------------------------------
// Configuration — override via env so no paths are hardcoded.
// ---------------------------------------------------------------------------
const DLL_PATH = process.env.MANTRA_DLL_PATH || 'C:\\Program Files\\Mantra\\MFS100\\MFS100.dll';
const LICENCE_KEY = process.env.MANTRA_LICENCE_KEY || '';

/**
 * Placeholder signature map. Each entry: [returnType, [argTypes...]]
 * koffi type names: 'int', 'void', 'str', 'uint8_t*', etc.
 */
const SDK_SIGNATURES = {
  // Initialise the SDK / open the device.
  MFS100_Init: ['int', []],
  // Release the device.
  MFS100_Uninit: ['int', []],
  // Blocking capture. Typical shape: (timeoutMs, minQuality, outImageBuf, outImageLen, outTemplateBuf, outTemplateLen, outQuality)
  MFS100_AutoCapture: ['int', ['int', 'int', 'uint8_t*', 'int*', 'uint8_t*', 'int*', 'int*']],
  // 1:1 match returning a similarity score.
  MFS100_MatchTemplate: ['int', ['uint8_t*', 'int', 'uint8_t*', 'int', 'int*']],
  // Device info string (serial etc).
  MFS100_GetDeviceInfo: ['int', ['uint8_t*', 'int*']],
};

let koffi = null;
let lib = null;
let fns = {};
let initialised = false;

/** True when the DLL exists on disk at the configured path. */
function isSdkAvailable() {
  try {
    return fs.existsSync(DLL_PATH);
  } catch {
    return false;
  }
}

/**
 * Loads the DLL and binds the functions in SDK_SIGNATURES.
 * Throws a clear, actionable error rather than a cryptic FFI failure.
 */
function loadLibrary() {
  if (lib) return;

  if (!isSdkAvailable()) {
    throw new Error(
      `Mantra SDK DLL not found at "${DLL_PATH}". Install the Mantra MFS110 non-Aadhaar SDK and set MANTRA_DLL_PATH in the agent's .env to the DLL's full path.`
    );
  }

  try {
    // koffi is loaded lazily so the agent can still start (and report a clear
    // status) on a machine without the SDK or without native build tools.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    koffi = require('koffi');
  } catch (err) {
    throw new Error(
      'The "koffi" FFI package is not installed. Run `npm install` inside backend/biometric-agent.'
    );
  }

  lib = koffi.load(DLL_PATH);

  const missing = [];
  for (const [name, [ret, args]] of Object.entries(SDK_SIGNATURES)) {
    try {
      fns[name] = lib.func(name, ret, args);
    } catch {
      missing.push(name);
    }
  }

  if (missing.length) {
    throw new Error(
      `These functions were not found in ${path.basename(DLL_PATH)}: ${missing.join(', ')}. ` +
        'The placeholder signatures in mantraSdk.js do not match your SDK version — ' +
        'update SDK_SIGNATURES using the real names from the SDK headers or C# samples.'
    );
  }
}

/** Buffer sizes — confirm against SDK docs; these are generous defaults. */
const IMAGE_BUFFER_BYTES = 512 * 1024; // raw fingerprint image
const TEMPLATE_BUFFER_BYTES = 4 * 1024; // ISO template is typically < 2KB

function init() {
  if (initialised) return;
  loadLibrary();

  // Some SDK builds take a licence key at init; others read it from a local
  // file written by the vendor's activation tool. Confirm which applies.
  const rc = fns.MFS100_Init();
  if (rc !== 0) {
    throw new Error(`Mantra SDK init failed (code ${rc}). Check the device is connected and the SDK licence is activated.`);
  }
  initialised = true;
}

function uninit() {
  if (!initialised) return;
  try {
    fns.MFS100_Uninit();
  } finally {
    initialised = false;
  }
}

/**
 * Captures a fingerprint and returns its template.
 *
 * @param {object} opts
 * @param {number} opts.timeoutMs How long to wait for a finger.
 * @param {number} opts.minQuality Reject captures below this (0-100).
 * @returns {{ template: string, qualityScore: number, image: string|null }}
 *          template/image are base64. image may be null if not requested.
 */
function capture({ timeoutMs = 20000, minQuality = 60, includeImage = false } = {}) {
  init();

  const imageBuf = Buffer.alloc(IMAGE_BUFFER_BYTES);
  const templateBuf = Buffer.alloc(TEMPLATE_BUFFER_BYTES);
  const imageLen = [IMAGE_BUFFER_BYTES];
  const templateLen = [TEMPLATE_BUFFER_BYTES];
  const quality = [0];

  const rc = fns.MFS100_AutoCapture(
    timeoutMs,
    minQuality,
    imageBuf,
    imageLen,
    templateBuf,
    templateLen,
    quality
  );

  if (rc !== 0) {
    throw new Error(`Fingerprint capture failed (SDK code ${rc}).`);
  }

  const templateBytes = templateLen[0];
  if (!templateBytes || templateBytes <= 0) {
    throw new Error('Capture succeeded but no template was produced. Try again with better finger placement.');
  }

  return {
    template: templateBuf.subarray(0, templateBytes).toString('base64'),
    qualityScore: quality[0],
    image: includeImage && imageLen[0] > 0 ? imageBuf.subarray(0, imageLen[0]).toString('base64') : null,
  };
}

/**
 * 1:1 match of two base64 templates using the SDK's own matcher.
 * Returns the raw similarity score; threshold comparison is the caller's job.
 */
function matchTemplates(templateA_b64, templateB_b64) {
  init();

  const a = Buffer.from(templateA_b64, 'base64');
  const b = Buffer.from(templateB_b64, 'base64');
  const score = [0];

  const rc = fns.MFS100_MatchTemplate(a, a.length, b, b.length, score);
  if (rc !== 0) {
    throw new Error(`Template match failed (SDK code ${rc}).`);
  }
  return score[0];
}

function getDeviceInfo() {
  init();
  const buf = Buffer.alloc(1024);
  const len = [1024];
  const rc = fns.MFS100_GetDeviceInfo(buf, len);
  if (rc !== 0) return { raw: null };
  return { raw: buf.subarray(0, len[0]).toString('utf8').replace(/\0+$/, '') };
}

module.exports = {
  isSdkAvailable,
  init,
  uninit,
  capture,
  matchTemplates,
  getDeviceInfo,
  DLL_PATH,
  LICENCE_KEY_CONFIGURED: Boolean(LICENCE_KEY),
};
