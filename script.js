'use strict';

/*
 * =====================================================
 * GOOGLE SHEETS VOICE INPUT
 * CENTRAL GITHUB APPLICATION
 * =====================================================
 *
 * IMPORTANT:
 *
 * This application NEVER talks directly to Google Sheets.
 *
 * Communication:
 *
 * Apps Script Sidebar
 *        ↕
 * window.postMessage()
 *        ↕
 * GitHub Voice App
 *
 * Apps Script remains responsible for writing
 * the final text into Google Sheets.
 */


/* =====================================================
 * CONFIGURATION
 * ===================================================== */

const GITHUB_ORIGIN = window.location.origin;


/* =====================================================
 * VARIABLES
 * ===================================================== */

let recognition = null;

let isListening = false;

let finalTranscript = '';

let currentTarget = null;

let openerWindow = null;


/* =====================================================
 * DOM ELEMENTS
 * ===================================================== */

const startButton =
  document.getElementById('startButton');

const stopButton =
  document.getElementById('stopButton');

const transcriptBox =
  document.getElementById('transcript');

const targetCell =
  document.getElementById('targetCell');

const status =
  document.getElementById('status');

const statusDescription =
  document.getElementById('statusDescription');

const statusDot =
  document.getElementById('statusDot');

const browserWarning =
  document.getElementById('browserWarning');

const connectionStatus =
  document.getElementById('connectionStatus');


/* =====================================================
 * SPEECH RECOGNITION
 * ===================================================== */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


/* =====================================================
 * STATUS UI
 * ===================================================== */

function setStatus(
  title,
  description,
  state = 'normal'
) {

  status.textContent = title;

  statusDescription.textContent =
    description;

  statusDot.className =
    'status-dot';

  if (state === 'listening') {
    statusDot.classList.add('listening');
  }

  if (state === 'success') {
    statusDot.classList.add('success');
  }

  if (state === 'error') {
    statusDot.classList.add('error');
  }

}


/* =====================================================
 * WARNING
 * ===================================================== */

function showWarning(message) {

  browserWarning.textContent =
    message;

  browserWarning.classList.remove(
    'hidden'
  );

}


function hideWarning() {

  browserWarning.textContent =
    '';

  browserWarning.classList.add(
    'hidden'
  );

}


/* =====================================================
 * UPDATE TARGET CELL
 * ===================================================== */

function updateTargetCell(target) {

  if (!target) {
    return;
  }

  if (!target.ok) {

    setStatus(
      'Selection unavailable',
      target.error || 'Could not detect selected cell.',
      'error'
    );

    return;
  }

  currentTarget =
    target;


  const sheetName =
    target.sheetName || '';

  const a1 =
    target.a1 || '';


  targetCell.textContent =
    sheetName
      ? `${sheetName}!${a1}`
      : a1;


  connectionStatus.textContent =
    'Connected to Google Sheet';

}


/* =====================================================
 * SEND MESSAGE TO APPS SCRIPT
 * =====================================================
 *
 * IMPORTANT:
 *
 * We cannot safely hard-code the Apps Script
 * sidebar origin because Apps Script HTML can
 * run from Google's sandboxed origin.
 *
 * Therefore:
 *
 * - the receiver validates event.origin
 * - we use "*" as targetOrigin
 *
 * The Apps Script sidebar only accepts messages
 * whose origin is our exact GitHub origin.
 */

function sendToAppsScript(message) {

  if (
    !openerWindow ||
    openerWindow.closed
  ) {

    setStatus(
      'Connection lost',
      'Close this window and open Voice Input again.',
      'error'
    );

    return;
  }


  openerWindow.postMessage(
    message,
    '*'
  );

}


/* =====================================================
 * RECEIVE MESSAGES FROM APPS SCRIPT
 * ===================================================== */

window.addEventListener(
  'message',
  function(event) {

    /*
     * IMPORTANT:
     *
     * We only accept messages from the
     * Google Apps Script/sidebar window
     * after the initial handshake.
     *
     * For the initial handshake we accept the
     * message because it is received from the
     * window that opened this application.
     */

    if (!event.data) {
      return;
    }


    const message =
      event.data;


    /* -----------------------------------------------
     * INITIAL SHEET CONNECTION
     * ----------------------------------------------- */

    if (
      message.type ===
      'VOICE_SHEET_INIT'
    ) {

      /*
       * Remember the exact window that sent
       * the initialization message.
       */

      openerWindow =
        event.source;


      updateTargetCell(
        message.target
      );


      connectionStatus.textContent =
        'Connected to Google Sheet';


      setStatus(
        'Ready',
        'Click Start and speak naturally.'
      );


      return;

    }


    /* -----------------------------------------------
     * CELL SELECTION CHANGED
     * ----------------------------------------------- */

    if (
      message.type ===
      'VOICE_SELECTION_CHANGED'
    ) {

      /*
       * Make sure this message comes from
       * the same Apps Script window that
       * initialized the application.
       */

      if (
        openerWindow &&
        event.source !== openerWindow
      ) {

        return;

      }


      updateTargetCell(
        message.target
      );


      return;

    }

  }
);


/* =====================================================
 * INITIALIZE SPEECH RECOGNITION
 * ===================================================== */

function initializeSpeechRecognition() {

  if (!SpeechRecognition) {

    showWarning(
      'Speech recognition is not available in this browser. ' +
      'Please use the latest Google Chrome or Microsoft Edge.'
    );


    startButton.disabled =
      true;


    setStatus(
      'Unsupported browser',
      'Please use Chrome or Edge.',
      'error'
    );


    return false;

  }


  recognition =
    new SpeechRecognition();


  /*
   * Recognize one speech session.
   */

  recognition.continuous =
    false;


  /*
   * Show partial results.
   */

  recognition.interimResults =
    true;


  recognition.maxAlternatives =
    1;


  /*
   * Indian English.
   *
   * Change to hi-IN if required.
   */

  recognition.lang =
    'en-IN';


  /* -----------------------------------------------
   * START
   * ----------------------------------------------- */

  recognition.onstart =
    function() {

      isListening =
        true;


      startButton.disabled =
        true;


      stopButton.disabled =
        false;


      setStatus(
        'Listening...',
        'Speak now.',
        'listening'
      );

    };


  /* -----------------------------------------------
   * RESULT
   * ----------------------------------------------- */

  recognition.onresult =
    function(event) {

      let interimTranscript =
        '';

      let completedTranscript =
        '';


      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {

        const text =
          event.results[i][0].transcript;


        if (
          event.results[i].isFinal
        ) {

          completedTranscript +=
            text;

        } else {

          interimTranscript +=
            text;

        }

      }


      if (completedTranscript) {

        finalTranscript +=
          completedTranscript;

      }


      transcriptBox.value =
        (
          finalTranscript +
          interimTranscript
        ).trim();

    };


  /* -----------------------------------------------
   * ERROR
   * ----------------------------------------------- */

  recognition.onerror =
    function(event) {

      let message =
        'Speech recognition error.';


      switch (event.error) {

        case 'not-allowed':

          message =
            'Microphone permission was denied. ' +
            'Allow microphone access and try again.';

          break;


        case 'no-speech':

          message =
            'No speech was detected. Please try again.';

          break;


        case 'audio-capture':

          message =
            'No microphone was detected. Check your microphone.';

          break;


        case 'network':

          message =
            'The browser speech recognition service could not be reached.';

          break;


        case 'aborted':

          message =
            'Speech recognition was stopped.';

          break;


        case 'language-not-supported':

          message =
            'The selected recognition language is not supported.';

          break;


        default:

          message =
            `Speech recognition error: ${event.error}`;

      }


      setStatus(
        'Recognition error',
        message,
        'error'
      );

    };


  /* -----------------------------------------------
   * END
   * ----------------------------------------------- */

  recognition.onend =
    function() {

      isListening =
        false;


      startButton.disabled =
        false;


      stopButton.disabled =
        true;


      const text =
        finalTranscript.trim();


      if (!text) {

        setStatus(
          'Ready',
          'No text was recognized.'
        );

        return;

      }


      /*
       * Speech recognition succeeded.
       *
       * Send text back to Apps Script.
       */

      setStatus(
        'Saving...',
        'Writing recognized text into the selected cell.'
      );


      sendToAppsScript({

        type:
          'VOICE_RESULT',

        text:
          text

      });

    };


  return true;

}


/* =====================================================
 * START RECOGNITION
 * ===================================================== */

function startRecognition() {

  if (!recognition) {

    if (
      !initializeSpeechRecognition()
    ) {

      return;

    }

  }


  /*
   * Clear previous result.
   */

  finalTranscript =
    '';


  transcriptBox.value =
    '';


  try {

    recognition.start();

  } catch (error) {

    console.error(
      'Speech recognition start error:',
      error
    );


    setStatus(
      'Could not start',
      'Please wait a moment and try again.',
      'error'
    );

  }

}


/* =====================================================
 * STOP RECOGNITION
 * ===================================================== */

function stopRecognition() {

  if (
    recognition &&
    isListening
  ) {

    recognition.stop();

  }

}


/* =====================================================
 * BUTTON EVENTS
 * ===================================================== */

startButton.addEventListener(
  'click',
  startRecognition
);


stopButton.addEventListener(
  'click',
  stopRecognition
);


/* =====================================================
 * APPLICATION STARTUP
 * ===================================================== */

(function boot() {

  /*
   * Browser check.
   */

  if (!SpeechRecognition) {

    showWarning(
      'This browser does not support SpeechRecognition. ' +
      'Please use Google Chrome or Microsoft Edge.'
    );


    startButton.disabled =
      true;


    return;

  }


  /*
   * Check that this page was opened
   * from another window.
   */

  if (
    window.opener &&
    !window.opener.closed
  ) {

    openerWindow =
      window.opener;


    /*
     * IMPORTANT:
     *
     * Do NOT use GITHUB_ORIGIN as the target.
     *
     * The receiver is the Apps Script sidebar,
     * which has a different origin.
     *
     * "*" is used for the initial handshake.
     *
     * The Apps Script sidebar validates that
     * the message came from our GitHub origin.
     */

    openerWindow.postMessage(
      {
        type:
          'VOICE_APP_READY'
      },
      '*'
    );


    connectionStatus.textContent =
      'Connecting to Google Sheet...';

  } else {

    connectionStatus.textContent =
      'Open this application from Google Sheets.';


    setStatus(
      'Waiting for Google Sheet',
      'Open Voice Input from the Google Sheets menu.'
    );

  }

})();
