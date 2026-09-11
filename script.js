'use strict';


/* =====================================================
 * GOOGLE SHEETS VOICE INPUT
 * ===================================================== */

const GITHUB_ORIGIN =
  window.location.origin;


/* =====================================================
 * VARIABLES
 * ===================================================== */

let recognition = null;

let isListening = false;

let finalTranscript = '';

let currentTarget = null;

let openerWindow = null;


/* =====================================================
 * DOM
 * ===================================================== */

const startButton =
  document.getElementById(
    'startButton'
  );

const stopButton =
  document.getElementById(
    'stopButton'
  );

const saveButton =
  document.getElementById(
    'saveButton'
  );

const transcriptBox =
  document.getElementById(
    'transcript'
  );

const targetCell =
  document.getElementById(
    'targetCell'
  );

const status =
  document.getElementById(
    'status'
  );

const statusDescription =
  document.getElementById(
    'statusDescription'
  );

const statusDot =
  document.getElementById(
    'statusDot'
  );

const browserWarning =
  document.getElementById(
    'browserWarning'
  );

const connectionStatus =
  document.getElementById(
    'connectionStatus'
  );


/* =====================================================
 * SPEECH API
 * ===================================================== */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


/* =====================================================
 * STATUS
 * ===================================================== */

function setStatus(
  title,
  description,
  state = 'normal'
) {

  status.textContent =
    title;

  statusDescription.textContent =
    description;

  statusDot.className =
    'status-dot';


  if (
    state === 'listening'
  ) {

    statusDot.classList.add(
      'listening'
    );

  }


  if (
    state === 'success'
  ) {

    statusDot.classList.add(
      'success'
    );

  }


  if (
    state === 'error'
  ) {

    statusDot.classList.add(
      'error'
    );

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
 * TARGET CELL
 * ===================================================== */

function updateTargetCell(target) {

  if (!target) {
    return;
  }


  if (!target.ok) {

    setStatus(
      'Selection unavailable',
      target.error ||
        'Could not detect selected cell.',
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
 * ===================================================== */

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

    return false;

  }


  openerWindow.postMessage(
    message,
    '*'
  );


  return true;

}


/* =====================================================
 * RECEIVE APPS SCRIPT MESSAGES
 * ===================================================== */

window.addEventListener(
  'message',
  function(event) {

    if (!event.data) {
      return;
    }


    const message =
      event.data;


    /* -----------------------------------------------
     * INITIAL CONNECTION
     * ----------------------------------------------- */

    if (
      message.type ===
      'VOICE_SHEET_INIT'
    ) {

      openerWindow =
        event.source;


      updateTargetCell(
        message.target
      );


      setStatus(
        'Ready',
        'Click Start and speak naturally.'
      );


      connectionStatus.textContent =
        'Connected to Google Sheet';


      return;

    }


    /* -----------------------------------------------
     * CELL CHANGED
     * ----------------------------------------------- */

    if (
      message.type ===
      'VOICE_SELECTION_CHANGED'
    ) {

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


    /* -----------------------------------------------
     * SAVE SUCCESS
     * ----------------------------------------------- */

    if (
      message.type ===
      'VOICE_SAVE_SUCCESS'
    ) {

      setStatus(
        'Saved successfully!',
        `${message.sheetName}!${message.a1}`,
        'success'
      );


      saveButton.disabled =
        true;


      startButton.disabled =
        true;


      stopButton.disabled =
        true;


      /*
       * Wait a moment so the user can see
       * "Saved successfully!"
       */

      setTimeout(
        function() {

          /*
           * Return to Google Sheet.
           *
           * This closes the popup that was
           * opened from the Sheet sidebar.
           */

          window.close();

        },
        800
      );


      return;

    }


    /* -----------------------------------------------
     * SAVE ERROR
     * ----------------------------------------------- */

    if (
      message.type ===
      'VOICE_SAVE_ERROR'
    ) {

      saveButton.disabled =
        false;


      setStatus(
        'Save failed',
        message.error ||
          'Could not save to Google Sheets.',
        'error'
      );


      return;

    }

  }
);


/* =====================================================
 * SPEECH RECOGNITION
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


  recognition.continuous =
    false;


  recognition.interimResults =
    true;


  recognition.maxAlternatives =
    1;


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


      saveButton.disabled =
        true;


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
   * RECOGNITION ENDED
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


      /*
       * IMPORTANT:
       *
       * Do NOT save automatically.
       */

      if (text) {

        saveButton.disabled =
          false;


        setStatus(
          'Ready to save',
          'Review the text, then click Save to Google Sheet.'
        );

      } else {

        saveButton.disabled =
          true;


        setStatus(
          'Ready',
          'No text was recognized.'
        );

      }

    };



  return true;

}


/* =====================================================
 * START
 * ===================================================== */

function startRecognition() {

  if (!recognition) {

    if (
      !initializeSpeechRecognition()
    ) {

      return;

    }

  }


  finalTranscript =
    '';


  transcriptBox.value =
    '';


  saveButton.disabled =
    true;


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
 * STOP
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
 * SAVE
 * ===================================================== */

function saveVoiceText() {

  const text =
    finalTranscript.trim();


  if (!text) {

    setStatus(
      'Nothing to save',
      'Please speak something first.',
      'error'
    );

    return;

  }


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


  /*
   * Disable button immediately so the
   * user cannot accidentally save twice.
   */

  saveButton.disabled =
    true;


  startButton.disabled =
    true;


  setStatus(
    'Saving...',
    'Writing text into the selected cell.'
  );


  sendToAppsScript({

    type:
      'VOICE_RESULT',

    text:
      text

  });

}


/* =====================================================
 * BUTTONS
 * ===================================================== */

startButton.addEventListener(
  'click',
  startRecognition
);


stopButton.addEventListener(
  'click',
  stopRecognition
);


saveButton.addEventListener(
  'click',
  saveVoiceText
);


/* =====================================================
 * STARTUP
 * ===================================================== */

(function boot() {

  if (!SpeechRecognition) {

    showWarning(
      'This browser does not support SpeechRecognition. ' +
      'Please use Google Chrome or Microsoft Edge.'
    );


    startButton.disabled =
      true;


    return;

  }


  if (
    window.opener &&
    !window.opener.closed
  ) {

    openerWindow =
      window.opener;


    /*
     * Tell Apps Script that the voice
     * application is ready.
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
