/* =========================================================
   GOOGLE SHEETS VOICE INPUT
   CENTRAL GITHUB APPLICATION
   ========================================================= */

let recognition = null;

let isListening = false;
let isSaving = false;

let finalTranscript = '';

let currentTarget = null;
let recordingTarget = null;

let openerWindow = null;

let restartTimer = null;

let recognitionSession = 0;


/* =========================================================
   ELEMENTS
   ========================================================= */

const targetCell =
  document.getElementById('targetCell');

const status =
  document.getElementById('status');

const statusDescription =
  document.getElementById('statusDescription');

const statusDot =
  document.getElementById('statusDot');

const transcript =
  document.getElementById('transcript');

const startButton =
  document.getElementById('startButton');

const stopButton =
  document.getElementById('stopButton');

const saveButton =
  document.getElementById('saveButton');

const browserWarning =
  document.getElementById('browserWarning');

const connectionStatus =
  document.getElementById('connectionStatus');


/* =========================================================
   SPEECH RECOGNITION
   ========================================================= */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


/* =========================================================
   CHECK BROWSER SUPPORT
   ========================================================= */

if (!SpeechRecognition) {

  browserWarning.style.display = 'block';

  startButton.disabled = true;

  setStatus(
    'Not supported',
    'Please use Google Chrome or Microsoft Edge.',
    'error'
  );

}


/* =========================================================
   UPDATE TARGET CELL
   ========================================================= */

function updateTargetCell(target) {

  if (
    !target ||
    !target.ok ||
    !target.a1 ||
    !target.sheetId
  ) {

    return;

  }


  /*
   * Store the COMPLETE target object.
   */

  currentTarget = {

    ok: true,

    spreadsheetId:
      target.spreadsheetId,

    spreadsheetName:
      target.spreadsheetName,

    sheetId:
      target.sheetId,

    sheetName:
      target.sheetName,

    a1:
      target.a1,

    row:
      target.row,

    column:
      target.column

  };


  /*
   * Display cell.
   */

  targetCell.textContent =
    target.sheetName +
    '!' +
    target.a1;

}


/* =========================================================
   MESSAGE HANDLER
   ========================================================= */

window.addEventListener(
  'message',
  function(event) {

    if (!event.data) {
      return;
    }


    const message =
      event.data;


    /* =====================================================
       GOOGLE SHEETS SIDEBAR INITIALIZATION
       ===================================================== */

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
        'Select a cell and click Start.',
        'ready'
      );


      return;

    }


    /* =====================================================
       GOOGLE SHEETS SELECTION CHANGED
       ===================================================== */

    if (
      message.type ===
      'VOICE_SELECTION_CHANGED'
    ) {

      /*
       * Do NOT change the recording target
       * while recording.
       */

      if (!isListening && !isSaving) {

        updateTargetCell(
          message.target
        );

      }


      return;

    }


    /* =====================================================
       SAVE SUCCESS
       ===================================================== */

    if (
      message.type ===
      'VOICE_SAVE_SUCCESS'
    ) {

      isSaving = false;

      isListening = false;


      finalTranscript = '';

      transcript.value = '';


      startButton.disabled = false;

      stopButton.disabled = true;

      saveButton.disabled = true;


      setStatus(
        'Saved successfully',
        'Text was saved to ' +
        message.sheetName +
        '!' +
        message.a1,
        'success'
      );


      /*
       * Ask Apps Script for the newest selected cell.
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


      return;

    }


    /* =====================================================
       SAVE ERROR
       ===================================================== */

    if (
      message.type ===
      'VOICE_SAVE_ERROR'
    ) {

      isSaving = false;

      startButton.disabled = false;

      saveButton.disabled =
        !finalTranscript.trim();


      setStatus(
        'Save failed',
        message.error ||
        message.message ||
        'Unable to save text.',
        'error'
      );


      return;

    }

  }
);


/* =========================================================
   CREATE NEW SPEECH RECOGNITION
   ========================================================= */

function createRecognition() {

  const instance =
    new SpeechRecognition();


  /*
   * Keep listening as long as possible.
   */

  instance.continuous = true;


  /*
   * Show words while speaking.
   */

  instance.interimResults = true;


  instance.maxAlternatives = 1;


  /*
   * Indian English.
   *
   * Change to "hi-IN" if you mainly speak Hindi.
   */

  instance.lang = 'en-IN';


  /* =======================================================
     START
     ======================================================= */

  instance.onstart =
    function() {

      isListening = true;


      startButton.disabled = true;

      stopButton.disabled = false;

      saveButton.disabled = true;


      setStatus(
        'Listening...',
        'Speak naturally. You can pause and continue.',
        'listening'
      );

    };


  /* =======================================================
     RESULT
     ======================================================= */

  instance.onresult =
    function(event) {

      let interimTranscript = '';


      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {

        const result =
          event.results[i];


        const text =
          result[0].transcript;


        if (result.isFinal) {

          finalTranscript +=
            text + ' ';

        } else {

          interimTranscript +=
            text;

        }

      }


      transcript.value =
        (
          finalTranscript +
          interimTranscript
        ).trim();


      /*
       * Keep Save disabled while recognition
       * is actively producing interim text.
       */

      saveButton.disabled =
        finalTranscript.trim() === '';

    };


  /* =======================================================
     ERROR
     ======================================================= */

  instance.onerror =
    function(event) {

      console.log(
        'Speech recognition error:',
        event.error
      );


      if (
        event.error ===
        'no-speech'
      ) {

        /*
         * Do NOT stop logical listening.
         *
         * Chrome may end the recognition session,
         * and onend() will create a new session.
         */

        setStatus(
          'Still listening...',
          'Pause detected. Continue speaking.',
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
          'Speech recognition connection interrupted.',
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


      if (
        event.error ===
        'not-allowed'
      ) {

        isListening = false;

        startButton.disabled = false;

        stopButton.disabled = true;

        saveButton.disabled =
          !finalTranscript.trim();


        setStatus(
          'Microphone blocked',
          'Allow microphone access in Chrome.',
          'error'
        );


        return;

      }


      if (
        event.error ===
        'audio-capture'
      ) {

        isListening = false;

        startButton.disabled = false;

        stopButton.disabled = true;


        setStatus(
          'Microphone unavailable',
          'Check your microphone.',
          'error'
        );

      }

    };


  /* =======================================================
     END
     ======================================================= */

  instance.onend =
    function() {

      /*
       * If user clicked Stop or Save,
       * do not restart.
       */

      if (
        !isListening ||
        isSaving
      ) {

        return;

      }


      /*
       * Ignore old recognition sessions.
       */

      const thisSession =
        recognitionSession;


      clearTimeout(
        restartTimer
      );


      /*
       * Chrome can end SpeechRecognition after
       * a pause. Create a completely NEW instance.
       */

      restartTimer =
        setTimeout(
          function() {

            if (
              !isListening ||
              isSaving ||
              thisSession !==
                recognitionSession
            ) {

              return;

            }


            try {

              recognition =
                createRecognition();


              recognition.start();

            } catch (error) {

              console.error(
                'Recognition restart failed:',
                error
              );


              if (isListening) {

                restartTimer =
                  setTimeout(
                    function() {

                      if (
                        isListening &&
                        !isSaving
                      ) {

                        recognition =
                          createRecognition();

                        recognition.start();

                      }

                    },
                    500
                  );

              }

            }

          },
          300
        );

    };


  return instance;

}


/* =========================================================
   START RECOGNITION
   ========================================================= */

function startRecognition() {

  if (!SpeechRecognition) {
    return;
  }


  if (isListening) {
    return;
  }


  if (isSaving) {
    return;
  }


  /*
   * IMPORTANT:
   *
   * Lock the selected cell at the moment
   * Start is clicked.
   */

  if (
    !currentTarget ||
    !currentTarget.a1 ||
    !currentTarget.sheetId ||
    !currentTarget.spreadsheetId
  ) {

    setStatus(
      'No target cell',
      'Please select a Google Sheets cell first.',
      'error'
    );


    return;

  }


  /*
   * Make a COPY.
   *
   * Do not simply use:
   *
   * recordingTarget = currentTarget
   *
   * because currentTarget may later change.
   */

  recordingTarget =
    JSON.parse(
      JSON.stringify(
        currentTarget
      )
    );


  /*
   * Clear previous recording.
   */

  finalTranscript = '';

  transcript.value = '';


  /*
   * New recognition session.
   */

  recognitionSession++;


  clearTimeout(
    restartTimer
  );


  try {

    recognition =
      createRecognition();


    recognition.start();

  } catch (error) {

    console.error(
      'Unable to start recognition:',
      error
    );


    isListening = false;


    setStatus(
      'Could not start',
      error.message ||
      'Unable to start microphone.',
      'error'
    );

  }

}


/* =========================================================
   STOP RECOGNITION
   ========================================================= */

function stopRecognition() {

  /*
   * IMPORTANT:
   * Set this FIRST.
   *
   * This prevents onend() from restarting.
   */

  isListening = false;


  recognitionSession++;


  clearTimeout(
    restartTimer
  );


  restartTimer = null;


  if (recognition) {

    try {

      recognition.stop();

    } catch (error) {

      console.log(
        'Recognition already stopped.'
      );

    }

  }


  startButton.disabled = false;

  stopButton.disabled = true;


  saveButton.disabled =
    finalTranscript.trim() === '';


  if (
    finalTranscript.trim()
  ) {

    setStatus(
      'Ready to save',
      'Review your text and click Save to Google Sheet.',
      'ready'
    );

  } else {

    setStatus(
      'Stopped',
      'No speech was captured.',
      'ready'
    );

  }

}


/* =========================================================
   SAVE VOICE TEXT
   ========================================================= */

function saveVoiceText() {

  /*
   * Prevent duplicate saves.
   */

  if (isSaving) {
    return;
  }


  /*
   * Use ONLY FINAL transcript.
   */

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
   * IMPORTANT:
   *
   * Save to the cell that was selected
   * when Start was clicked.
   */

  if (
    !recordingTarget ||
    !recordingTarget.a1 ||
    !recordingTarget.sheetId ||
    !recordingTarget.spreadsheetId
  ) {

    setStatus(
      'Target cell unavailable',
      'Please close this window and open Voice Input again.',
      'error'
    );


    return;

  }


  /*
   * Stop listening BEFORE saving.
   */

  isListening = false;


  isSaving = true;


  recognitionSession++;


  clearTimeout(
    restartTimer
  );


  restartTimer = null;


  if (recognition) {

    try {

      recognition.stop();

    } catch (error) {

      console.log(
        'Recognition already stopped.'
      );

    }

  }


  startButton.disabled = true;

  stopButton.disabled = true;

  saveButton.disabled = true;


  setStatus(
    'Saving...',
    'Writing text into ' +
    recordingTarget.sheetName +
    '!' +
    recordingTarget.a1,
    'saving'
  );


  /*
   * =======================================================
   * SEND RESULT TO APPS SCRIPT SIDEBAR
   * =======================================================
   *
   * THIS IS THE IMPORTANT FIX.
   *
   * Send the COMPLETE recordingTarget object.
   */

  if (
    openerWindow &&
    !openerWindow.closed
  ) {

    openerWindow.postMessage(
      {

        type:
          'VOICE_RESULT',

        text:
          text,

        target:
          {
            ok: true,

            spreadsheetId:
              recordingTarget.spreadsheetId,

            spreadsheetName:
              recordingTarget.spreadsheetName,

            sheetId:
              recordingTarget.sheetId,

            sheetName:
              recordingTarget.sheetName,

            a1:
              recordingTarget.a1,

            row:
              recordingTarget.row,

            column:
              recordingTarget.column

          }

      },
      '*'
    );


  } else {

    isSaving = false;

    startButton.disabled = false;

    saveButton.disabled = false;


    setStatus(
      'Connection lost',
      'Google Sheets connection was lost.',
      'error'
    );

  }

}


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(
  title,
  description,
  type
) {

  status.textContent =
    title;


  statusDescription.textContent =
    description;


  statusDot.className =
    'status-dot';


  if (type) {

    statusDot.classList.add(
      type
    );

  }

}


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

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


/* =========================================================
   INITIAL STATE
   ========================================================= */

stopButton.disabled = true;

saveButton.disabled = true;


/* =========================================================
   TELL GOOGLE SHEETS SIDEBAR WE ARE READY
   ========================================================= */

window.addEventListener(
  'load',
  function() {

    setTimeout(
      function() {

        if (window.opener) {

          openerWindow =
            window.opener;


          openerWindow.postMessage(
            {
              type:
                'VOICE_APP_READY'
            },
            '*'
          );

        }

      },
      100
    );

  }
);
