'use strict';

/*
 * Google Sheets Voice Input
 *
 * Central application.
 *
 * This application communicates with the
 * Google Apps Script sidebar using postMessage.
 */

const GITHUB_ORIGIN = window.location.origin;

let recognition = null;
let isListening = false;
let finalTranscript = '';

let currentTarget = null;
let openerWindow = null;


/* --------------------------------------------------
 * DOM ELEMENTS
 * -------------------------------------------------- */

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


/* --------------------------------------------------
 * SPEECH RECOGNITION SUPPORT
 * -------------------------------------------------- */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


/* --------------------------------------------------
 * UI HELPERS
 * -------------------------------------------------- */

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


function showWarning(message) {

  browserWarning.textContent = message;

  browserWarning.classList.remove('hidden');
}


function hideWarning() {

  browserWarning.textContent = '';

  browserWarning.classList.add('hidden');
}


/* --------------------------------------------------
 * TARGET CELL
 * -------------------------------------------------- */

function updateTargetCell(target) {

  if (!target) {
    return;
  }

  currentTarget = target;

  const sheetName =
    target.sheetName || '';

  const a1 =
    target.a1 || '';

  targetCell.textContent =
    sheetName
      ? `${sheetName}!${a1}`
      : a1;
}


/* --------------------------------------------------
 * COMMUNICATION WITH APPS SCRIPT
 * -------------------------------------------------- */

function sendToAppsScript(message) {

  if (
    !openerWindow ||
    openerWindow.closed
  ) {
    setStatus(
      'Connection lost',
      'Please close this window and open Voice Input again.',
      'error'
    );

    return;
  }

  openerWindow.postMessage(
    message,
    GITHUB_ORIGIN
  );
}


/* --------------------------------------------------
 * RECEIVE INITIAL DATA / CELL CHANGES
 * -------------------------------------------------- */

window.addEventListener(
  'message',
  function(event) {

    /*
     * Only accept messages from the
     * GitHub application itself.
     */

    if (event.origin !== GITHUB_ORIGIN) {
      return;
    }

    if (!event.data) {
      return;
    }

    const message =
      event.data;

    if (
      message.type ===
      'VOICE_SHEET_INIT'
    ) {

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


    if (
      message.type ===
      'VOICE_SELECTION_CHANGED'
    ) {

      updateTargetCell(
        message.target
      );

      /*
       * Do not change the text being
       * recognized if the user changes
       * cells while listening.
       *
       * The final result will go into
       * whichever cell is current when
       * the result is submitted.
       */

      return;
    }

  }
);


/* --------------------------------------------------
 * SPEECH RECOGNITION INITIALIZATION
 * -------------------------------------------------- */

function initializeSpeechRecognition() {

  if (!SpeechRecognition) {

    showWarning(
      'Speech recognition is not available in this browser. ' +
      'Please use the latest Google Chrome or Microsoft Edge.'
    );

    startButton.disabled = true;

    setStatus(
      'Unsupported browser',
      'Please open this application in Chrome or Edge.',
      'error'
    );

    return false;
  }

  recognition =
    new SpeechRecognition();

  /*
   * One utterance at a time.
   *
   * The browser will stop after the
   * user finishes speaking.
   */

  recognition.continuous = false;

  recognition.interimResults = true;

  recognition.maxAlternatives = 1;

  /*
   * Change this to hi-IN if the team
   * primarily speaks Hindi.
   *
   * en-IN is suitable for Indian English.
   */

  recognition.lang = 'en-IN';


  recognition.onstart =
    function() {

      isListening = true;

      startButton.disabled = true;

      stopButton.disabled = false;

      setStatus(
        'Listening...',
        'Speak now. The browser is converting your voice to text.',
        'listening'
      );
    };


  recognition.onresult =
    function(event) {

      let interimTranscript = '';

      let completedTranscript = '';


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


  recognition.onerror =
    function(event) {

      let message =
        'Speech recognition error.';


      switch (event.error) {

        case 'not-allowed':
          message =
            'Microphone permission was denied. Allow microphone access and try again.';
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
            'The selected recognition language is not supported by this browser.';
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


  recognition.onend =
    function() {

      const text =
        finalTranscript.trim();


      isListening = false;

      startButton.disabled = false;

      stopButton.disabled = true;


      /*
       * If we have recognized text,
       * send it back to Apps Script.
       */

      if (text) {

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

      } else {

        setStatus(
          'Ready',
          'No text was recognized.'
        );

      }

    };


  return true;
}


/* --------------------------------------------------
 * START
 * -------------------------------------------------- */

function startRecognition() {

  if (!recognition) {

    if (!initializeSpeechRecognition()) {
      return;
    }

  }


  /*
   * Reset the previous transcript.
   */

  finalTranscript = '';

  transcriptBox.value = '';


  try {

    recognition.start();

  } catch (error) {

    /*
     * Calling start() twice throws.
     */

    console.error(error);

    setStatus(
      'Could not start',
      'Please wait a moment and try again.',
      'error'
    );

  }

}


/* --------------------------------------------------
 * STOP
 * -------------------------------------------------- */

function stopRecognition() {

  if (
    recognition &&
    isListening
  ) {

    recognition.stop();

  }

}


/* --------------------------------------------------
 * BUTTONS
 * -------------------------------------------------- */

startButton.addEventListener(
  'click',
  startRecognition
);

stopButton.addEventListener(
  'click',
  stopRecognition
);


/* --------------------------------------------------
 * PAGE STARTUP
 * -------------------------------------------------- */

(function boot() {

  if (!SpeechRecognition) {

    showWarning(
      'This browser does not provide SpeechRecognition. ' +
      'Use Google Chrome or Microsoft Edge.'
    );

    startButton.disabled = true;

    return;
  }

  /*
   * Tell the Apps Script opener that
   * this window is ready.
   */

  if (
    window.opener &&
    !window.opener.closed
  ) {

    openerWindow =
      window.opener;

    connectionStatus.textContent =
      'Connecting to Google Sheet...';


    openerWindow.postMessage(
      {
        type:
          'VOICE_APP_READY'
      },
      GITHUB_ORIGIN
    );

  } else {

    connectionStatus.textContent =
      'Opened directly — Google Sheet connection unavailable.';

    setStatus(
      'Waiting for Google Sheet',
      'Open this application from the Google Sheets Voice Input menu.'
    );

  }

})();
