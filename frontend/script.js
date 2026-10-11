const startButton = document.getElementById("start-camera");
const scannerStatus = document.getElementById("scanner-status");

// const resultCard = document.getElementById("result-card");
// const errorCard = document.getElementById("error-card");

// const resultTitle = document.getElementById("result-title");
// const resultIcon = document.getElementById("result-icon");

// const studentIdElement = document.getElementById("student-id");
// const studentNameElement = document.getElementById("student-name");
// const studentCourseElement = document.getElementById("student-course");
// const studentYearElement = document.getElementById("student-year");
// const scanTimeElement = document.getElementById("scan-time");

const historyBody =
    document.getElementById("scan-history");

const scanCount =
    document.getElementById("scan-count");

const approvalModal =
    document.getElementById("approval-modal");

const approvalMessage =
    document.getElementById("approval-message");

const errorMessage = document.getElementById("error-message");
const exitTimeButton = document.getElementById("exittimeconfirm");

const approveButton =
    document.getElementById("approve-early-exit");

const cancelApprovalButton =
    document.getElementById("cancel-approval");

approveButton.addEventListener(
    "click",
    approveEarlyExit
);


cancelApprovalButton.addEventListener(
    "click",
    cancelEarlyExit
);

const API_URL = "https://id-scanner-prototype-blue.onrender.com";


let scanner = null;
let scannerRunning = false;
let processingScan = false;
let pendingStudentId = null;


/* ----------------------------------
   Start camera
---------------------------------- */

startButton.addEventListener("click", startScanner);


async function startScanner() {

    if (scannerRunning) {
        return;
    }


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

async function sendScanToBackend(studentId, approveEarlyExit = false) {

    scannerStatus.textContent =
        "Processing student ID...";

    try {

        const response = await fetch(`${API_URL}/api/scan`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                student_id: studentId.trim(),
                approve_early_exit: approveEarlyExit
            })

        });


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail || "Student ID not found."
            );
        }


        if (
            data.status ===
            "approval_required"
        ) {

            pendingStudentId =
                studentId;

            showApprovalPrompt(data);

            processingScan = false;

            return;
        }


        if (
            data.status ===
            "recorded"
        ) {

            addScanRow(data);
        }


    } catch (error) {

        console.error(error);

        scannerStatus.textContent =
            error.message;

    } finally {

        if (!approvalModal.classList.contains(
            "hidden"
        )) {
            return;
        }

        setTimeout(() => {

            processingScan = false;

            scannerStatus.textContent =
                "Ready for next scan.";

        }, 2500);
    }
}




exitTimeButton.addEventListener("click",setExitTime);
async function setExitTime() {
    const exitTime = document.getElementById("exittime").value;

    try{
        const response = await fetch(`${API_URL}/api/settings/exit-time`,
        {
            method:'POST', headers:{"Content-Type":"application/json"},body: JSON.stringify({exit_time:exitTime})
        })

        if (!response.ok) {
            throw new Error(
                "Failed to update exit time."
            );
        }

        const data = await response.json();

        alert(
            `Exit time set to ${data.exit_time}`
        );
    } catch (error){
        console.error(error);
        alert("Couldn't update Time");
    }
    
};


/* ----------------------------------
   Error
---------------------------------- */

// function showError(message) {

//     hideResult();

//     errorMessage.textContent = message;

//     errorCard.classList.remove("hidden");
// }


// function hideError() {

//     errorCard.classList.add("hidden");
// }


// function hideResult() {

//     resultCard.classList.add("hidden");
// }


/* ----------------------------------
   NEW FUNCS
---------------------------------- */


function addScanRow(data) {

    const row =
        document.createElement("tr");


    const statusClass =
        data.scan_status === "entry"
            ? "status-entry"
            : "status-exit";


    row.innerHTML = `
        <td>${escapeHtml(data.student_id)}</td>

        <td>${escapeHtml(data.name)}</td>

        <td>${escapeHtml(data.course)}</td>

        <td>${data.year}</td>

        <td>
            <span class="status ${statusClass}">
                ${data.scan_status.toUpperCase()}
            </span>
        </td>

        <td>
            ${formatTime(data.timestamp)}
        </td>
    `;


    // Newest scan at the top.
    historyBody.prepend(row);


    updateScanCount();
}


function updateScanCount() {

    const count =
        historyBody.children.length;

    scanCount.textContent =
        `${count} scan${count === 1 ? "" : "s"}`;
}


function showApprovalPrompt(data) {

    approvalMessage.textContent =
        `${data.name} (${data.student_id}) ` +
        `is attempting to exit before ` +
        `${formatAllowedTime(
            data.allowed_exit_time
        )}. ` +
        `Approve only if valid permission has been provided.`;


    approvalModal.classList.remove(
        "hidden"
    );
}


function approveEarlyExit() {

    if (!pendingStudentId) {
        return;
    }


    const studentId =
        pendingStudentId;


    closeApprovalPrompt();


    // Keep processing locked while
    // the approved request is sent.
    processingScan = true;


    sendScanToBackend(
        studentId,
        true
    );
}


function cancelEarlyExit() {

    closeApprovalPrompt();

    pendingStudentId = null;

    processingScan = false;

    scannerStatus.textContent =
        "Exit not recorded. Ready for next scan.";
}


function closeApprovalPrompt() {

    approvalModal.classList.add(
        "hidden"
    );
}


function formatTime(timestamp) {

    const date =
        new Date(timestamp);

    return date.toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );
}


function formatAllowedTime(timeString) {

    const [hours, minutes] =
        timeString.split(":");

    const date =
        new Date();

    date.setHours(
        Number(hours),
        Number(minutes),
        0,
        0
    );

    return date.toLocaleTimeString(
        [],
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent = value;

    return div.innerHTML;
}