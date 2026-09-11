'use strict';


/* =====================================================
 * GOOGLE SHEETS VOICE INPUT
 * ===================================================== */


/*
 * =====================================================
 * VARIABLES
 * ===================================================== */

let recognition =
  null;


let isListening =
  false;


let isSaving =
  false;


let finalTranscript =
  '';


let currentTarget =
  null;


let recordingTarget =
  null;


let openerWindow =
  null;


let restartTimer =
  null;


let recognitionSession =
  0;


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
 * SPEECH RECOGNITION
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

function showWarning(
  message
) {

  browserWarning.textContent =
    message;


  browserWarning.classList.remove(
    'hidden'
  );

}


/* =====================================================
 * UPDATE TARGET CELL
 * ===================================================== */

function updateTargetCell(
  target
) {

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


  targetCell.textContent =

    target.sheetName +
    '!' +
    target.a1;


  connectionStatus.textContent =
    'Connected to Google Sheet';


  /*
   * IMPORTANT:
   *
   * If we are NOT recording, the newly selected
   * cell becomes the available recording target.
   *
   * If recording IS already active, we keep
   * recordingTarget unchanged.
   */

}


/* =====================================================
 * SEND MESSAGE TO APPS SCRIPT
 * ===================================================== */

function sendToAppsScript(
  message
) {

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

        'Select a cell and click Start.'

      );


      connectionStatus.textContent =
        'Connected to Google Sheet';


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
       * Ignore selection changes while
       * recording.
       *
       * This keeps the recording locked to
       * the cell selected when Start was clicked.
       */

      if (
        isListening
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


      recognition =
        null;


      if (restartTimer) {

        clearTimeout(
          restartTimer
        );

        restartTimer =
          null;

      }


      setStatus(

        'Saved successfully!',

        `${message.sheetName}!${message.a1}`,

        'success'

      );


      /*
       * Clear previous transcript.
       */

      finalTranscript =
        '';


      transcriptBox.value =
        '';


      /*
       * Prepare for another recording.
       */

      startButton.disabled =
        false;


      stopButton.disabled =
        true;


      saveButton.disabled =
        true;


      /*
       * Ask Apps Script for the latest
       * selected cell.
       */

      setTimeout(

        function() {

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

        700

      );


      /*
       * IMPORTANT:
       *
       * DO NOT close the window.
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


      startButton.disabled =
        false;


      stopButton.disabled =
        true;


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
 * CREATE RECOGNITION
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
   * CONTINUOUS LISTENING
   */

  newRecognition.continuous =
    true;


  /*
   * Show partial speech.
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
   * newRecognition.lang = 'hi-IN';
   */

  newRecognition.lang =
    'en-IN';


  /* ===================================================
   * ON START
   * =================================================== */

  newRecognition.onstart =
    function() {

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
        true;


      setStatus(

        'Listening...',

        'You can pause and continue speaking. Click Stop when finished.',

        'listening'

      );

    };


  /* ===================================================
   * ON RESULT
   * =================================================== */

  newRecognition.onresult =
    function(event) {

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

        let i =
          event.resultIndex;

        i <
          event.results.length;

        i++

      ) {

        const text =
          event.results[i][0].transcript;


        if (
          event.results[i].isFinal
        ) {

          completedTranscript +=
            text;

        }

        else {

          interimTranscript +=
            text;

        }

      }


      /*
       * Store final speech.
       */

      if (
        completedTranscript
      ) {

        finalTranscript +=
          completedTranscript;

      }


      /*
       * Display final + interim.
       */

      transcriptBox.value =

        (

          finalTranscript +
          interimTranscript

        ).trim();

    };


  /* ===================================================
   * ON ERROR
   * =================================================== */

  newRecognition.onerror =
    function(event) {

      console.log(

        'Speech recognition error:',

        event.error

      );


      /*
       * NO SPEECH
       *
       * Do not stop the user's logical
       * recording session.
       */

      if (
        event.error ===
        'no-speech'
      ) {

        setStatus(

          'Listening...',

          'Pause detected. Continue speaking whenever you are ready.',

          'listening'

        );


        return;

      }


      /*
       * NETWORK
       */

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


      /*
       * ABORTED
       */

      if (
        event.error ===
        'aborted'
      ) {

        return;

      }


      /*
       * MICROPHONE PERMISSION
       */

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


      /*
       * MICROPHONE HARDWARE
       */

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


        saveButton.disabled =
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
       */

      setStatus(

        'Listening...',

        'Speech recognition is reconnecting.',

        'listening'

      );

    };


  /* ===================================================
   * ON END
   * =================================================== */

  newRecognition.onend =
    function() {

      /*
       * If the user is still logically recording,
       * create a completely NEW recognition instance.
       */

      if (

        isListening &&

        !isSaving &&

        thisSession ===
        recognitionSession

      ) {

        setStatus(

          'Listening...',

          'Reconnecting after pause...',

          'listening'

        );


        if (restartTimer) {

          clearTimeout(
            restartTimer
          );

        }


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
               * New recognition session.
               */

              recognitionSession++;


              const nextRecognition =
                createRecognition();


              if (!nextRecognition) {

                return;

              }


              recognition =
                nextRecognition;


              try {

                recognition.start();

              }

              catch (error) {

                console.log(

                  'Recognition restart failed:',

                  error

                );


                /*
                 * Retry once more shortly after.
                 */

                if (
                  isListening &&
                  !isSaving
                ) {

                  setTimeout(

                    function() {

                      if (
                        !isListening ||
                        isSaving
                      ) {

                        return;

                      }


                      recognitionSession++;


                      const retry =
                        createRecognition();


                      if (!retry) {

                        return;

                      }


                      recognition =
                        retry;


                      try {

                        recognition.start();

                      }

                      catch (retryError) {

                        console.log(

                          'Retry failed:',

                          retryError

                        );

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
       * User clicked Stop or Save.
       */

      startButton.disabled =
        false;


      stopButton.disabled =
        true;


      if (!isSaving) {

        if (
          finalTranscript.trim()
        ) {

          saveButton.disabled =
            false;


          setStatus(

            'Stopped',

            'Review the text or click Save.'

          );

        }

        else {

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
 * START
 * ===================================================== */

function startRecognition() {

  /*
   * Cancel pending restart.
   */

  if (restartTimer) {

    clearTimeout(
      restartTimer
    );

    restartTimer =
      null;

  }


  /*
   * New logical recording session.
   */

  recognitionSession++;


  isListening =
    true;


  isSaving =
    false;


  /*
   * IMPORTANT:
   *
   * Lock the cell that was selected when
   * Start was clicked.
   */

  recordingTarget =
    currentTarget
      ? {
          ok:
            currentTarget.ok,

          spreadsheetId:
            currentTarget.spreadsheetId,

          spreadsheetName:
            currentTarget.spreadsheetName,

          sheetId:
            currentTarget.sheetId,

          sheetName:
            currentTarget.sheetName,

          a1:
            currentTarget.a1,

          row:
            currentTarget.row,

          column:
            currentTarget.column
        }
      : null;


  if (!recordingTarget) {

    isListening =
      false;


    setStatus(

      'No cell selected',

      'Select a cell before clicking Start.',

      'error'

    );


    return;

  }


  /*
   * Clear old transcript.
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
   * Create fresh recognition object.
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

  }

  catch (error) {

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
   * Set isListening FALSE FIRST.
   *
   * This prevents onend() from restarting.
   */

  isListening =
    false;


  isSaving =
    false;


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


  startButton.disabled =
    false;


  stopButton.disabled =
    true;


  /*
   * Keep Save available.
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

  }

  else {

    saveButton.disabled =
      true;


    setStatus(

      'Stopped',

      'No text was recognized.'

    );

  }


  /*
   * Stop browser recognition.
   */

  if (recognition) {

    try {

      recognition.stop();

    }

    catch (error) {

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


  /*
   * Use the cell that was selected when
   * recording started.
   */

  if (!recordingTarget) {

    setStatus(

      'No target cell',

      'Select a cell and start recording again.',

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
   * Stop logical recording session.
   */

  isListening =
    false;


  isSaving =
    true;


  recognitionSession++;


  /*
   * Cancel automatic restart.
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
   * Stop microphone.
   */

  if (recognition) {

    try {

      recognition.stop();

    }

    catch (error) {

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
   * Send BOTH:
   *
   * text
   * target cell
   *
   * to Apps Script.
   */

  sendToAppsScript(

    {

      type:
        'VOICE_RESULT',

      text:
        text,

      target:
        recordingTarget

    }

  );

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
   * Confirm opened from Google Sheets.
   */

  if (

    window.opener &&

    !window.opener.closed

  ) {

    openerWindow =
      window.opener;


    /*
     * Tell Apps Script sidebar:
     *
     * Voice App is ready.
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

  }

  else {

    connectionStatus.textContent =
      'Open this application from Google Sheets.';


    setStatus(

      'Waiting for Google Sheet',

      'Open Voice Input from the Google Sheets menu.'

    );

  }

})();
