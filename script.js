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
      'The Google Sheets window is no longer available.',
      'error'
    );

    return false;

  }


  /*
   * Keep the existing Apps Script
   * communication architecture.
   *
   * The Apps Script sidebar is the
   * opener window.
   */

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


    /*
     * Only accept messages from the
     * expected GitHub/parent context.
     *
     * The initial VOICE_SHEET_INIT is
     * accepted from the opener and establishes
     * the communication window.
     */

    if (
      GITHUB_ORIGIN &&
      event.source !== window &&
      openerWindow &&
      event.source !== openerWindow
    ) {

      return;

    }


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


      /*
       * Make sure the application starts
       * in a clean ready state.
       */

      isListening =
        false;

      isSaving =
        false;

      finalTranscript =
        '';

      transcriptBox.value =
        '';

      startButton.disabled =
        false;

      stopButton.disabled =
        true;

      saveButton.disabled =
        true;


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
       * Always update the target.
       *
       * This is important because the employee
       * may select another cell while the voice
       * window is open.
       */

      updateTargetCell(
        message.target
      );


      /*
       * If a recording is NOT running and a
       * save is NOT running, prepare for a
       * completely new entry.
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
       * IMPORTANT:
       *
       * Do NOT close the window.
       */

      setStatus(
        'Saved successfully!',
        `${message.sheetName}!${message.a1}`,
        'success'
      );


      saveButton.disabled =
        true;

      startButton.disabled =
        false;

      stopButton.disabled =
        true;


      /*
       * Keep the previous text visible
       * until the employee selects another
       * cell.
       *
       * When the new cell arrives through
       * VOICE_SELECTION_CHANGED, the transcript
       * will be cleared automatically.
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


  recognition.continuous =
    true;


  recognition.interimResults =
    true;


  recognition.maxAlternatives =
    1;


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


  /* ===================================================
   * RECOGNITION ERROR
   * =================================================== */

  recognition.onerror =
    function(event) {

      console.log(
        'Speech recognition error:',
        event.error
      );


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

      if (
        isListening &&
        !isSaving
      ) {

        setStatus(
          'Listening...',
          'Reconnecting microphone...',
          'listening'
        );


        setTimeout(
          function() {

            if (
              isListening &&
              !isSaving &&
              recognition
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
   * Always start with a fresh recognition
   * session and a fresh transcript.
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


  isListening =
    true;


  isSaving =
    false;


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
   * Set this FIRST so onend() does not
   * automatically restart.
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
   * Prevent recognition from restarting.
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
   * Send the text to the Sidebar.
   */

  const sent =
    sendToAppsScript({

      type:
        'VOICE_RESULT',

      text:
        text

    });


  /*
   * If the message could not be sent,
   * don't leave the application stuck
   * in the saving state.
   */

  if (!sent) {

    isSaving =
      false;


    startButton.disabled =
      false;

    stopButton.disabled =
      true;

    saveButton.disabled =
      false;

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


saveButton.addEventListener(
  'click',
  saveVoiceText
);


/* =====================================================
 * START APPLICATION
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
     * Tell the Apps Script Sidebar:
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
