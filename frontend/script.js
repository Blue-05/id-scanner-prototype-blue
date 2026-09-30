const startButton = document.getElementById("start-camera");
const scannerStatus = document.getElementById("scanner-status");

const resultCard = document.getElementById("result-card");
const errorCard = document.getElementById("error-card");

const resultTitle = document.getElementById("result-title");
const resultIcon = document.getElementById("result-icon");

const studentIdElement = document.getElementById("student-id");
const studentNameElement = document.getElementById("student-name");
const studentCourseElement = document.getElementById("student-course");
const studentYearElement = document.getElementById("student-year");
const scanTimeElement = document.getElementById("scan-time");

const errorMessage = document.getElementById("error-message");


let scanner = null;
let scannerRunning = false;
let processingScan = false;


/* ----------------------------------
   Start camera
---------------------------------- */

startButton.addEventListener("click", startScanner);


async function startScanner() {

    if (scannerRunning) {
        return;
    }

    hideResult();
    hideError();

    startButton.disabled = true;

    scannerStatus.textContent = "Requesting camera access...";

    scanner = new Html5Qrcode("reader");

    try {

        await scanner.start(

            {
                facingMode: "environment"
            },

            {
                fps: 10,

                qrbox: function(viewfinderWidth, viewfinderHeight) {

                    const size = Math.min(
                        viewfinderWidth,
                        viewfinderHeight
                    ) * 0.7;

                    return {
                        width: size,
                        height: size
                    };
                }
            },

            onScanSuccess,

            onScanFailure

        );

        scannerRunning = true;

        startButton.textContent = "Camera Active";

        scannerStatus.textContent =
            "Point your camera at the QR code.";

    } catch (error) {

        console.error(error);

        scannerStatus.textContent =
            "Unable to access the camera.";

        startButton.disabled = false;

        showError(
            "Camera access was denied or is unavailable."
        );
    }
}


/* ----------------------------------
   QR detection
---------------------------------- */

function onScanSuccess(decodedText) {

    /*
     * Prevent the same QR code from triggering
     * multiple requests while it is still visible.
     */

    if (processingScan) {
        return;
    }

    processingScan = true;

    console.log("QR detected:", decodedText);

    sendScanToBackend(decodedText);
}


/*
 * html5-qrcode calls this frequently while it
 * is looking for a QR code.
 *
 * We intentionally don't do anything here.
 */

function onScanFailure(error) {
    // Normal during scanning.
}


/* ----------------------------------
   Send QR data to backend
---------------------------------- */

async function sendScanToBackend(studentId) {

    scannerStatus.textContent =
        "Processing student ID...";

    try {

        const response = await fetch("/api/scan", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                student_id: studentId.trim()
            })

        });


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail || "Student ID not found."
            );
        }


        displayScanResult(data);


    } catch (error) {

        console.error(error);

        showError(error.message);

    }


    /*
     * Wait before allowing another scan.
     *
     * This prevents the same QR code from
     * being scanned repeatedly.
     */

    setTimeout(() => {

        processingScan = false;

        scannerStatus.textContent =
            "Ready for next scan.";

    }, 2500);
}


/* ----------------------------------
   Display successful scan
---------------------------------- */

function displayScanResult(data) {

    hideError();

    resultCard.classList.remove("hidden");


    studentIdElement.textContent =
        data.student_id;

    studentNameElement.textContent =
        data.name;

    studentCourseElement.textContent =
        data.course;

    studentYearElement.textContent =
        `Year ${data.year}`;


    const date = new Date(data.timestamp);

    scanTimeElement.textContent =
        date.toLocaleTimeString();


    if (data.status === "entry") {

        resultTitle.textContent =
            "Entry Recorded";

        resultIcon.textContent = "✓";

    } else {

        resultTitle.textContent =
            "Exit Recorded";

        resultIcon.textContent = "→";
    }
}


/* ----------------------------------
   Error
---------------------------------- */

function showError(message) {

    hideResult();

    errorMessage.textContent = message;

    errorCard.classList.remove("hidden");
}


function hideError() {

    errorCard.classList.add("hidden");
}


function hideResult() {

    resultCard.classList.add("hidden");
}