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

let restartTimer = null;

let recognitionSession = 0;


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
 * SEND TO APPS SCRIPT
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

  isSaving =
    false;

  isListening =
    false;


  /*
   * Clear the old recognition session.
   */

  recognition =
    null;


  /*
   * Clear any restart timer.
   */

  if (restartTimer) {

    clearTimeout(
      restartTimer
    );

    restartTimer =
      null;

  }


  /*
   * Show successful save.
   */

  setStatus(
    'Saved successfully!',
    `${message.sheetName}!${message.a1}`,
    'success'
  );


  /*
   * Clear the old text so the next
   * recording starts fresh.
   */

  finalTranscript =
    '';

  transcriptBox.value =
    '';


  /*
   * IMPORTANT:
   *
   * DO NOT close the window.
   *
   * Keep Voice Input open so the user
   * can select another cell and record again.
   */

  startButton.disabled =
    false;

  stopButton.disabled =
    true;

  saveButton.disabled =
    true;


  /*
   * After a short delay, show the user
   * that the app is ready for another cell.
   */

  setTimeout(
    function() {

      /*
       * Ask the Apps Script sidebar for
       * the latest selected cell.
       */

      if (
        openerWindow &&
        !openerWindow.closed
      ) {

        openerWindow.postMessage(
          {
            type:
              'VOICE_REQUEST_SELECTION'
          },
          '*'
        );

      }


      setStatus(
        'Ready',
        'Select another cell and click Start.'
      );

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

      isSaving =
        false;


      saveButton.disabled =
        false;


      startButton.disabled =
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
 * CREATE NEW RECOGNITION INSTANCE
 *
 * IMPORTANT:
 *
 * Every time Chrome ends a recognition session,
 * we create a completely NEW SpeechRecognition object.
 *
 * This is much more reliable than calling start()
 * again on an already-ended recognition object.
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


    return null;

  }


  const thisSession =
    recognitionSession;


  const newRecognition =
    new SpeechRecognition();


  /*
   * Continuous mode allows Chrome to return
   * multiple recognition results.
   */

  newRecognition.continuous =
    true;


  /*
   * Show partial/interim speech.
   */

  newRecognition.interimResults =
    true;


  newRecognition.maxAlternatives =
    1;


  /*
   * Indian English.
   *
   * For Hindi:
   *
   * 'hi-IN'
   */

  newRecognition.lang =
    'en-IN';


  /* ===================================================
   * START
   * =================================================== */

  newRecognition.onstart =
    function() {

      /*
       * Ignore an old recognition instance.
       */

      if (
        thisSession !==
        recognitionSession
      ) {

        return;

      }


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
        'You can pause and continue speaking. Click Stop when finished.',
        'listening'
      );

    };


  /* ===================================================
   * RESULT
   * =================================================== */

  newRecognition.onresult =
    function(event) {

      /*
       * Ignore stale recognition instances.
       */

      if (
        thisSession !==
        recognitionSession
      ) {

        return;

      }


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
       * Preserve completed speech.
       */

      if (completedTranscript) {

        finalTranscript +=
          completedTranscript;

      }


      /*
       * Display everything collected so far.
       */

      transcriptBox.value =
        (
          finalTranscript +
          interimTranscript
        ).trim();

    };


  /* ===================================================
   * ERROR
   * =================================================== */

  newRecognition.onerror =
    function(event) {

      console.log(
        'Speech recognition error:',
        event.error
      );


      /*
       * IMPORTANT:
       *
       * Do not stop the logical voice session
       * for temporary errors.
       */


      if (
        event.error ===
        'no-speech'
      ) {

        setStatus(
          'Listening...',
          'Pause detected. You can continue speaking.',
          'listening'
        );


        return;

      }


      if (
        event.error ===
        'network'
      ) {

        setStatus(
          'Reconnecting...',
          'Reconnecting speech recognition...',
          'listening'
        );


        return;

      }


      if (
        event.error ===
        'aborted'
      ) {

        /*
         * onend() will decide whether to restart.
         */

        return;

      }


      if (
        event.error ===
        'not-allowed'
      ) {

        isListening =
          false;


        startButton.disabled =
          false;


        stopButton.disabled =
          true;


        saveButton.disabled =
          true;


        setStatus(
          'Microphone permission denied',
          'Allow microphone access and click Start again.',
          'error'
        );


        return;

      }


      if (
        event.error ===
        'audio-capture'
      ) {

        isListening =
          false;


        startButton.disabled =
          false;


        stopButton.disabled =
          true;


        setStatus(
          'Microphone unavailable',
          'Check your microphone and click Start again.',
          'error'
        );


        return;

      }


      /*
       * Other temporary errors.
       *
       * Don't immediately terminate the
       * user's voice session.
       */

      setStatus(
        'Listening...',
        'Speech recognition is reconnecting.',
        'listening'
      );

    };


  /* ===================================================
   * END
   * =================================================== */

  newRecognition.onend =
    function() {

      /*
       * This recognition instance is finished.
       *
       * But the USER'S voice session may still
       * be active.
       */


      if (
        isListening &&
        !isSaving &&
        thisSession === recognitionSession
      ) {

        setStatus(
          'Listening...',
          'Reconnecting after pause...',
          'listening'
        );


        /*
         * Clear any old timer.
         */

        if (restartTimer) {

          clearTimeout(
            restartTimer
          );

        }


        /*
         * Create a completely NEW recognition
         * instance.
         */

        restartTimer =
          setTimeout(
            function() {

              if (
                !isListening ||
                isSaving
              ) {

                return;

              }


              /*
               * Increment session.
               *
               * This makes the old recognition
               * instance obsolete.
               */

              recognitionSession++;


              /*
               * Start a NEW recognition object.
               */

              const nextRecognition =
                createRecognition();


              if (!nextRecognition) {
                return;
              }


              recognition =
                nextRecognition;


              try {

                recognition.start();

              } catch (error) {

                console.log(
                  'Recognition restart failed:',
                  error
                );


                /*
                 * Try again if the user is
                 * still listening.
                 */

                if (
                  isListening &&
                  !isSaving
                ) {

                  setTimeout(
                    function() {

                      if (
                        isListening &&
                        !isSaving
                      ) {

                        recognitionSession++;


                        const retry =
                          createRecognition();


                        if (retry) {

                          recognition =
                            retry;


                          try {

                            recognition.start();

                          } catch (e) {

                            console.log(
                              'Retry failed:',
                              e
                            );

                          }

                        }

                      }

                    },
                    700
                  );

                }

              }

            },
            300
          );


        return;

      }


      /*
       * If isListening is FALSE,
       * the user clicked Stop or Save.
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
            'Stopped',
            'Review the text or click Save to Google Sheet.'
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


  return newRecognition;

}


/* =====================================================
 * START LISTENING
 * ===================================================== */

function startRecognition() {

  /*
   * Cancel any previous restart timer.
   */

  if (restartTimer) {

    clearTimeout(
      restartTimer
    );

    restartTimer =
      null;

  }


  /*
   * New logical voice session.
   */

  recognitionSession++;


  isListening =
    true;


  isSaving =
    false;


  /*
   * Clear previous transcript.
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
   * Create completely new recognition.
   */

  const newRecognition =
    createRecognition();


  if (!newRecognition) {

    isListening =
      false;

    return;

  }


  recognition =
    newRecognition;


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
   * Set isListening = false FIRST.
   *
   * This guarantees that onend() will NOT
   * create another recognition session.
   */

  isListening =
    false;


  isSaving =
    false;


  recognitionSession++;


  /*
   * Cancel automatic restart timer.
   */

  if (restartTimer) {

    clearTimeout(
      restartTimer
    );

    restartTimer =
      null;

  }


  startButton.disabled =
    false;


  stopButton.disabled =
    true;


  /*
   * Keep Save available if text exists.
   */

  if (
    finalTranscript.trim()
  ) {

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
   * Stop current recognition.
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
   * STOP THE LOGICAL VOICE SESSION FIRST.
   */

  isListening =
    false;


  isSaving =
    true;


  recognitionSession++;


  /*
   * Cancel restart timer.
   */

  if (restartTimer) {

    clearTimeout(
      restartTimer
    );

    restartTimer =
      null;

  }


  /*
   * Disable controls.
   */

  startButton.disabled =
    true;


  stopButton.disabled =
    true;


  saveButton.disabled =
    true;


  /*
   * Stop recognition.
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
   * Send the accumulated final transcript
   * to Apps Script.
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
 * APPLICATION STARTUP
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
