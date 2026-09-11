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


if (!SpeechRecognition) {

  browserWarning.classList.remove(
    'hidden'
  );

  browserWarning.textContent =
    'Speech recognition is not supported. Please use Google Chrome or Microsoft Edge.';

  startButton.disabled = true;

}


/* =========================================================
   UPDATE TARGET
   ========================================================= */

function updateTargetCell(
  target
) {

  if (
    !target ||
    !target.ok ||
    !target.a1 ||
    !target.sheetId
  ) {

    return;

  }


  currentTarget = {

    ok: true,

    spreadsheetId:
      target.spreadsheetId || '',

    spreadsheetName:
      target.spreadsheetName || '',

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
       INITIAL TARGET
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
       SELECTION CHANGED
       ===================================================== */

    if (
      message.type ===
      'VOICE_SELECTION_CHANGED'
    ) {

      /*
       * Never change target while recording.
       */

      if (
        !isListening &&
        !isSaving
      ) {

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

      isSaving =
        false;

      isListening =
        false;


      finalTranscript =
        '';

      transcript.value =
        '';


      startButton.disabled =
        false;

      stopButton.disabled =
        true;

      saveButton.disabled =
        true;


      setStatus(
        'Saved successfully',
        'Text saved to ' +
        message.sheetName +
        '!' +
        message.a1,
        'success'
      );


      /*
       * Ask Sidebar for its cached current cell.
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

      isSaving =
        false;


      startButton.disabled =
        false;


      saveButton.disabled =
        !finalTranscript.trim();


      setStatus(
        'Save failed',
        message.error ||
        'Unable to save text.',
        'error'
      );


      return;

    }

  }
);


/* =========================================================
   CREATE RECOGNITION
   ========================================================= */

function createRecognition() {

  const instance =
    new SpeechRecognition();


  instance.continuous =
    true;


  instance.interimResults =
    true;


  instance.maxAlternatives =
    1;


  instance.lang =
    'en-IN';


  /* =======================================================
     START
     ======================================================= */

  instance.onstart =
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
        'Speak naturally. You can pause and continue.',
        'listening'
      );

    };


  /* =======================================================
     RESULT
     ======================================================= */

  instance.onresult =
    function(event) {

      let interimTranscript =
        '';


      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {

        const result =
          event.results[i];


        const text =
          result[0].transcript;


        if (
          result.isFinal
        ) {

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


      saveButton.disabled =
        !finalTranscript.trim();

    };


  /* =======================================================
     ERROR
     ======================================================= */

  instance.onerror =
    function(event) {

      console.log(
        'Speech error:',
        event.error
      );


      if (
        event.error ===
        'no-speech'
      ) {

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

        isListening =
          false;


        startButton.disabled =
          false;


        stopButton.disabled =
          true;


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

        isListening =
          false;


        startButton.disabled =
          false;


        stopButton.disabled =
          true;


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
       * Do not restart after Stop or Save.
       */

      if (
        !isListening ||
        isSaving
      ) {

        return;

      }


      const thisSession =
        recognitionSession;


      clearTimeout(
        restartTimer
      );


      /*
       * Chrome can end recognition after a pause.
       *
       * Create a NEW recognition instance.
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
                'Restart error:',
                error
              );

            }

          },
          300
        );

    };


  return instance;

}


/* =========================================================
   START
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
   * Target must already exist.
   */

  if (
    !currentTarget ||
    !currentTarget.ok ||
    !currentTarget.a1 ||
    !currentTarget.sheetId
  ) {

    setStatus(
      'No target cell',
      'Please select a cell in Google Sheets.',
      'error'
    );


    return;

  }


  /*
   * LOCK TARGET.
   *
   * If user selects another cell while speaking,
   * the recording still saves to the original cell.
   */

  recordingTarget =
    JSON.parse(
      JSON.stringify(
        currentTarget
      )
    );


  finalTranscript =
    '';

  transcript.value =
    '';


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
      error
    );


    isListening =
      false;


    setStatus(
      'Could not start',
      error.message ||
      'Unable to start microphone.',
      'error'
    );

  }

}


/* =========================================================
   STOP
   ========================================================= */

function stopRecognition() {

  /*
   * Set this FIRST so onend doesn't restart.
   */

  isListening =
    false;


  recognitionSession++;


  clearTimeout(
    restartTimer
  );


  restartTimer =
    null;


  if (recognition) {

    try {

      recognition.stop();

    } catch (error) {

      console.log(
        'Recognition already stopped.'
      );

    }

  }


  startButton.disabled =
    false;


  stopButton.disabled =
    true;


  saveButton.disabled =
    !finalTranscript.trim();


  if (
    finalTranscript.trim()
  ) {

    setStatus(
      'Ready to save',
      'Review the text and click Save.',
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
   SAVE
   ========================================================= */

function saveVoiceText() {

  if (isSaving) {
    return;
  }


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
   * The target was locked when Start was clicked.
   */

  if (
    !recordingTarget ||
    !recordingTarget.a1 ||
    !recordingTarget.sheetId
  ) {

    setStatus(
      'Target cell unavailable',
      'Please select a cell and start recording again.',
      'error'
    );


    return;

  }


  /*
   * Stop recognition.
   */

  isListening =
    false;


  isSaving =
    true;


  recognitionSession++;


  clearTimeout(
    restartTimer
  );


  if (recognition) {

    try {

      recognition.stop();

    } catch (error) {

      console.log(
        'Recognition already stopped.'
      );

    }

  }


  startButton.disabled =
    true;

  stopButton.disabled =
    true;

  saveButton.disabled =
    true;


  setStatus(
    'Saving...',
    'Writing text into ' +
    recordingTarget.sheetName +
    '!' +
    recordingTarget.a1,
    'saving'
  );


  /*
   * Send COMPLETE target to Sidebar.
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
              recordingTarget.spreadsheetId || '',

            spreadsheetName:
              recordingTarget.spreadsheetName || '',

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

    isSaving =
      false;


    startButton.disabled =
      false;


    saveButton.disabled =
      false;


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
   BUTTONS
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

stopButton.disabled =
  true;

saveButton.disabled =
  true;


/* =========================================================
   INITIALIZE
   ========================================================= */

window.addEventListener(
  'load',
  function() {

    if (window.opener) {

      openerWindow =
        window.opener;


      /*
       * Tell Sidebar we are ready.
       */

      openerWindow.postMessage(
        {
          type:
            'VOICE_APP_READY'
        },
        '*'
      );

    }

  }
);
