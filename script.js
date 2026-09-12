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

let isSaving = false;

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
 * SPEECH RECOGNITION SUPPORT
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
 * CURRENT CELL
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
 * RECEIVE MESSAGES
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


      /*
       * Update the selected cell.
       *
       * IMPORTANT:
       *
       * The voice window stays open.
       * The user can simply select another
       * Google Sheets cell and continue.
       */

      updateTargetCell(
        message.target
      );


      /*
       * If we are not currently listening
       * and not currently saving, prepare
       * the application for the new cell.
       *
       * This clears the previous entry so
       * the next Start creates a completely
       * new voice entry.
       */

      if (
        !isListening &&
        !isSaving
      ) {

        finalTranscript =
          '';

        transcriptBox.value =
          '';

        saveButton.disabled =
          true;

        startButton.disabled =
          false;

        stopButton.disabled =
          true;


        setStatus(
          'Ready',
          'New cell selected. Click Start and speak.'
        );

      }


      return;

    }


    /* -----------------------------------------------
     * SAVE SUCCESS
     * ----------------------------------------------- */

    if (
      message.type ===
      'VOICE_SAVE_SUCCESS'
    ) {

      isSaving =
        false;


      /*
       * Keep the success message visible.
       */

      setStatus(
        'Saved successfully!',
        `${message.sheetName}!${message.a1}`,
        'success'
      );


      /*
       * IMPORTANT CHANGE:
       *
       * DO NOT close the voice window.
       *
       * The user can now select another
       * cell in Google Sheets and continue.
       */

      saveButton.disabled =
        true;

      startButton.disabled =
        false;

      stopButton.disabled =
        true;


      /*
       * The old code had:
       *
       * setTimeout(function() {
       *   window.close();
       * }, 800);
       *
       * That has intentionally been removed.
       */


      return;

    }


    /* -----------------------------------------------
     * SAVE ERROR
     * ----------------------------------------------- */

    if (
      message.type ===
      'VOICE_SAVE_ERROR'
    ) {

      isSaving =
        false;


      saveButton.disabled =
        false;


      startButton.disabled =
        false;


      stopButton.disabled =
        true;


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
 * CREATE SPEECH RECOGNITION
 * ===================================================== */

function createRecognition() {

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
   * IMPORTANT
   *
   * continuous = TRUE
   *
   * The recognition session is intended to
   * remain active while the user is listening.
   */

  recognition.continuous =
    true;


  /*
   * Show partial speech while speaking.
   */

  recognition.interimResults =
    true;


  recognition.maxAlternatives =
    1;


  /*
   * Indian English.
   *
   * For Hindi use:
   *
   * recognition.lang = 'hi-IN';
   */

  recognition.lang =
    'en-IN';


  /* ===================================================
   * RECOGNITION START
   * =================================================== */

  recognition.onstart =
    function() {

      if (!isListening) {
        return;
      }


      startButton.disabled =
        true;


      stopButton.disabled =
        false;


      saveButton.disabled =
        false;


      setStatus(
        'Listening...',
        'Keep speaking. Click Stop when you are finished.',
        'listening'
      );

    };


  /* ===================================================
   * RECOGNITION RESULT
   * =================================================== */

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


      /*
       * Store FINAL text permanently.
       */

      if (completedTranscript) {

        finalTranscript +=
          completedTranscript;

      }


      /*
       * Show final + current interim text.
       */

      transcriptBox.value =
        (
          finalTranscript +
          interimTranscript
        ).trim();

    };


  /* ===================================================
   * RECOGNITION ERROR
   * =================================================== */

  recognition.onerror =
    function(event) {

      console.log(
        'Speech recognition error:',
        event.error
      );


      /*
       * These errors should not automatically
       * cancel our listening state.
       *
       * The onend handler can restart recognition
       * if the user has not clicked Stop or Save.
       */

      if (
        event.error ===
        'not-allowed'
      ) {

        isListening =
          false;


        setStatus(
          'Microphone permission denied',
          'Allow microphone access and click Start again.',
          'error'
        );


        startButton.disabled =
          false;

        stopButton.disabled =
          true;

        saveButton.disabled =
          true;


        return;

      }


      if (
        event.error ===
        'audio-capture'
      ) {

        isListening =
          false;


        setStatus(
          'Microphone unavailable',
          'Check your microphone and click Start again.',
          'error'
        );


        startButton.disabled =
          false;

        stopButton.disabled =
          true;


        return;

      }


      if (
        event.error ===
        'network'
      ) {

        /*
         * Do not turn off listening.
         *
         * onend() will attempt to restart.
         */

        setStatus(
          'Reconnecting...',
          'Speech recognition is reconnecting.'
        );


        return;

      }


      if (
        event.error ===
        'no-speech'
      ) {

        /*
         * This is NOT a reason to stop.
         *
         * Keep listening.
         */

        setStatus(
          'Still listening...',
          'No speech detected. Keep speaking or click Stop.',
          'listening'
        );


        return;

      }


      if (
        event.error ===
        'aborted'
      ) {

        /*
         * If the user didn't intentionally stop,
         * onend() can restart it.
         */

        return;

      }


      setStatus(
        'Recognition issue',
        `Speech recognition reported: ${event.error}`,
        'error'
      );

    };


  /* ===================================================
   * RECOGNITION END
   * =================================================== */

  recognition.onend =
    function() {

      /*
       * IMPORTANT:
       *
       * If the user is STILL listening,
       * automatically restart recognition.
       *
       * This prevents the browser from ending
       * the user's voice session simply because
       * one recognition session ended.
       */

      if (
        isListening &&
        !isSaving
      ) {

        setStatus(
          'Listening...',
          'Reconnecting microphone...',
          'listening'
        );


        /*
         * Small delay prevents Chrome from
         * rejecting an immediate restart.
         */

        setTimeout(
          function() {

            if (
              isListening &&
              !isSaving
            ) {

              try {

                recognition.start();

              } catch (error) {

                console.log(
                  'Recognition restart:',
                  error
                );

              }

            }

          },
          250
        );


        return;

      }


      /*
       * If we reach here, the user intentionally
       * stopped or clicked Save.
       */

      startButton.disabled =
        false;


      stopButton.disabled =
        true;


      if (!isSaving) {

        const text =
          finalTranscript.trim();


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

      }

    };


  return true;

}


/* =====================================================
 * START LISTENING
 * ===================================================== */

function startRecognition() {

  /*
   * If an old recognition object exists,
   * create a fresh one.
   */

  if (recognition) {

    try {

      recognition.abort();

    } catch (error) {

      console.log(error);

    }

  }


  recognition =
    null;


  /*
   * User has explicitly chosen Start.
   */

  isListening =
    true;


  isSaving =
    false;


  /*
   * Clear old text.
   *
   * This means every new Start is a
   * completely new entry.
   */

  finalTranscript =
    '';


  transcriptBox.value =
    '';


  saveButton.disabled =
    true;


  startButton.disabled =
    true;


  stopButton.disabled =
    false;


  /*
   * Create recognition.
   */

  if (
    !createRecognition()
  ) {

    isListening =
      false;

    return;

  }


  try {

    recognition.start();

  } catch (error) {

    console.error(
      'Speech recognition start error:',
      error
    );


    isListening =
      false;


    startButton.disabled =
      false;


    stopButton.disabled =
      true;


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

  /*
   * IMPORTANT:
   *
   * Change isListening FIRST.
   *
   * This prevents onend() from automatically
   * restarting recognition.
   */

  isListening =
    false;


  isSaving =
    false;


  startButton.disabled =
    false;


  stopButton.disabled =
    true;


  const text =
    finalTranscript.trim();


  if (text) {

    saveButton.disabled =
      false;


    setStatus(
      'Stopped',
      'Recording stopped. Review the text or click Save.'
    );

  } else {

    saveButton.disabled =
      true;


    setStatus(
      'Stopped',
      'No text was recognized.'
    );

  }


  /*
   * Now actually stop browser recognition.
   */

  if (recognition) {

    try {

      recognition.stop();

    } catch (error) {

      console.log(
        'Stop recognition:',
        error
      );

    }

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
   * IMPORTANT:
   *
   * Save means:
   *
   * 1. Stop listening
   * 2. Prevent automatic restart
   * 3. Send text to Apps Script
   */

  isListening =
    false;


  isSaving =
    true;


  startButton.disabled =
    true;


  stopButton.disabled =
    true;


  saveButton.disabled =
    true;


  /*
   * Stop recognition if currently active.
   */

  if (recognition) {

    try {

      recognition.stop();

    } catch (error) {

      console.log(
        'Save stop:',
        error
      );

    }

  }


  setStatus(
    'Saving...',
    'Writing text into the selected cell.'
  );


  /*
   * Send text to Apps Script.
   *
   * Apps Script will determine the current
   * selected cell and write the text there.
   */

  sendToAppsScript({

    type:
      'VOICE_RESULT',

    text:
      text

  });

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


saveButton.addEventListener(
  'click',
  saveVoiceText
);


/* =====================================================
 * START APPLICATION
 * ===================================================== */

(function boot() {

  /*
   * Browser compatibility.
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
   * We expect this page to have been opened
   * from the Google Sheets Apps Script sidebar.
   */

  if (
    window.opener &&
    !window.opener.closed
  ) {

    openerWindow =
      window.opener;


    /*
     * Tell the Apps Script sidebar:
     *
     * "The voice application is ready."
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
