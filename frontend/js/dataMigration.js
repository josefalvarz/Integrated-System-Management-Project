const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));

if (!loggedInUser) {
  window.location.href = "login.html";
}

if (loggedInUser && loggedInUser.role !== "admin") {
  alert("Access denied. Only administrators can access Data Migration.");
  window.location.href = "dashboard.html";
}

const importForm = document.getElementById("importForm");
const memberFileInput = document.getElementById("memberFile");
const selectedFileName = document.getElementById("selectedFileName");

const totalRowsElement = document.getElementById("totalRows");
const importedRowsElement = document.getElementById("importedRows");
const invalidRowsElement = document.getElementById("invalidRows");
const duplicateRowsElement = document.getElementById("duplicateRows");

const issueList = document.getElementById("issueList");
const summaryBox = document.getElementById("summaryBox");

const progressFill = document.getElementById("progressFill");
const pipelineStatus = document.getElementById("pipelineStatus");

const sidebarUserName = document.getElementById("sidebarUserName");
const sidebarUserRole = document.getElementById("sidebarUserRole");
const userInitials = document.getElementById("userInitials");
const logoutBtn = document.getElementById("logoutBtn");

const previewSection = document.getElementById("previewSection");
const validPreviewTableBody = document.getElementById("validPreviewTableBody");
const invalidPreviewTableBody = document.getElementById("invalidPreviewTableBody");
const validPreviewNote = document.getElementById("validPreviewNote");
const invalidPreviewNote = document.getElementById("invalidPreviewNote");
const confirmImportBtn = document.getElementById("confirmImportBtn");
const cancelImportBtn = document.getElementById("cancelImportBtn");

let previewValidRecords = [];
let previewInvalidRecords = [];

if (loggedInUser) {
  const displayName = loggedInUser.name || loggedInUser.email || "Admin";

  sidebarUserName.textContent = displayName;
  sidebarUserRole.textContent = loggedInUser.role || "admin";
  userInitials.textContent = displayName.charAt(0).toUpperCase();
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", function () {
    window.location.href = "logout.html";
  });
}

memberFileInput.addEventListener("change", function () {
  if (memberFileInput.files.length > 0) {
    selectedFileName.textContent = memberFileInput.files[0].name;
    resetPreviewOnly();
  } else {
    selectedFileName.textContent = "No file selected";
  }
});

importForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!memberFileInput.files || memberFileInput.files.length === 0) {
    alert("Please choose a CSV or Excel file first.");
    return;
  }

  const file = memberFileInput.files[0];
  const formData = new FormData();

  formData.append("memberFile", file);

  setLoadingState(true, "Previewing...");
  setProgress(35);

  try {
    const response = await fetch("/api/data-migration/preview", {
      method: "POST",
      headers: {
        "x-user-role": loggedInUser.role,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Preview failed.");
    }

    previewValidRecords = data.preview.validRecords || [];
    previewInvalidRecords = data.preview.invalidRecords || [];

    updatePreview(data.preview);
    setProgress(70);

    summaryBox.innerHTML = `
      <div class="preview-message">
        Preview generated successfully. Please review the records before confirming the import.
      </div>
    `;
  } catch (error) {
    alert(error.message);
    setProgress(0);
  } finally {
    setLoadingState(false, "Preview member data");
  }
});

confirmImportBtn.addEventListener("click", async function () {
  if (!previewValidRecords || previewValidRecords.length === 0) {
    alert("There are no valid records to import.");
    return;
  }

  const confirmImport = confirm(
    `Are you sure you want to import ${previewValidRecords.length} valid record(s)?`
  );

  if (!confirmImport) {
    return;
  }

  confirmImportBtn.disabled = true;
  cancelImportBtn.disabled = true;
  confirmImportBtn.textContent = "Importing...";
  setProgress(90);

  try {
    const response = await fetch("/api/data-migration/confirm-import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": loggedInUser.role,
      },
      body: JSON.stringify({
        validRecords: previewValidRecords,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Import failed.");
    }

    updateSummary(data.summary);
    setProgress(100);

    previewSection.classList.add("hidden");
    previewValidRecords = [];
    previewInvalidRecords = [];

    alert("Import confirmed successfully.");
  } catch (error) {
    alert(error.message);
    setProgress(70);
  } finally {
    confirmImportBtn.disabled = false;
    cancelImportBtn.disabled = false;
    confirmImportBtn.textContent = "Confirm Import";
  }
});

cancelImportBtn.addEventListener("click", function () {
  const cancelPreview = confirm(
    "Are you sure you want to cancel this import? No records will be saved."
  );

  if (!cancelPreview) {
    return;
  }

  resetAllImportState();

  summaryBox.innerHTML = `
    Upload a CSV or Excel file to preview the import results.
  `;

  alert("Import cancelled. No records were saved.");
});

function setLoadingState(isLoading, buttonText) {
  const button = importForm.querySelector("button");

  if (isLoading) {
    button.disabled = true;
    button.textContent = buttonText || "Processing...";
  } else {
    button.disabled = false;
    button.textContent = buttonText || "Preview member data";
  }
}

function setProgress(percent) {
  progressFill.style.width = `${percent}%`;
  pipelineStatus.textContent = `${percent}%`;
}

function updatePreview(preview) {
  totalRowsElement.textContent = preview.totalRows;
  importedRowsElement.textContent = preview.validRows;
  invalidRowsElement.textContent = preview.invalidRows;
  duplicateRowsElement.textContent = preview.duplicateRows;

  renderIssues(preview.invalidRecords);
  renderValidPreview(preview.validRecords);
  renderInvalidPreview(preview.invalidRecords);

  previewSection.classList.remove("hidden");
}

function updateSummary(summary) {
  totalRowsElement.textContent = summary.totalRows;
  importedRowsElement.textContent = summary.importedRows;
  invalidRowsElement.textContent = summary.invalidRows;
  duplicateRowsElement.textContent = summary.duplicateRows;

  renderIssues(summary.failedRows);
  renderImportedRecords(summary.importedRecords, summary);
}

function renderIssues(failedRows) {
  issueList.innerHTML = "";

  if (!failedRows || failedRows.length === 0) {
    issueList.innerHTML = `
      <p class="dm-empty-message">No issues detected. All rows were valid.</p>
    `;
    return;
  }

  failedRows.forEach(function (failedRow) {
    const issueItem = document.createElement("div");
    issueItem.classList.add("issue-item");

    issueItem.innerHTML = `
      <div>
        <strong>Row ${failedRow.row}</strong>
        <p>${escapeHtml(failedRow.name)} · ${escapeHtml(failedRow.email)}</p>
        <small>${failedRow.errors.map(escapeHtml).join(", ")}</small>
      </div>
    `;

    issueList.appendChild(issueItem);
  });
}

function renderValidPreview(validRecords) {
  validPreviewTableBody.innerHTML = "";

  if (!validRecords || validRecords.length === 0) {
    validPreviewTableBody.innerHTML = `
      <tr>
        <td colspan="4">No valid records found.</td>
      </tr>
    `;
    validPreviewNote.textContent = "";
    return;
  }

  const rowsHtml = validRecords
    .slice(0, 20)
    .map(function (record) {
      return `
        <tr>
          <td>${escapeHtml(record.name)}</td>
          <td>${escapeHtml(record.email)}</td>
          <td>${escapeHtml(record.phone || "-")}</td>
          <td>${escapeHtml(record.joined || "-")}</td>
        </tr>
      `;
    })
    .join("");

  validPreviewTableBody.innerHTML = rowsHtml;

  validPreviewNote.textContent =
    validRecords.length > 20
      ? `Showing first 20 valid records only. Total valid records: ${validRecords.length}.`
      : `Total valid records: ${validRecords.length}.`;
}

function renderInvalidPreview(invalidRecords) {
  invalidPreviewTableBody.innerHTML = "";

  if (!invalidRecords || invalidRecords.length === 0) {
    invalidPreviewTableBody.innerHTML = `
      <tr>
        <td colspan="4">No invalid or duplicate records found.</td>
      </tr>
    `;
    invalidPreviewNote.textContent = "";
    return;
  }

  const rowsHtml = invalidRecords
    .slice(0, 20)
    .map(function (record) {
      return `
        <tr>
          <td>${escapeHtml(record.row)}</td>
          <td>${escapeHtml(record.name || "N/A")}</td>
          <td>${escapeHtml(record.email || "N/A")}</td>
          <td>${record.errors.map(escapeHtml).join(", ")}</td>
        </tr>
      `;
    })
    .join("");

  invalidPreviewTableBody.innerHTML = rowsHtml;

  invalidPreviewNote.textContent =
    invalidRecords.length > 20
      ? `Showing first 20 invalid or duplicate records only. Total issues: ${invalidRecords.length}.`
      : `Total issues: ${invalidRecords.length}.`;
}

function renderImportedRecords(importedRecords, summary) {
  if (!importedRecords || importedRecords.length === 0) {
    summaryBox.innerHTML = `
      <strong>Import completed, but no records were imported.</strong>
      <p>Please check the failed rows and fix your file.</p>
    `;
    return;
  }

  const rowsHtml = importedRecords
    .slice(0, 10)
    .map(function (record) {
      return `
        <tr>
          <td>${escapeHtml(record.name)}</td>
          <td>${escapeHtml(record.email)}</td>
          <td>${escapeHtml(record.phone || "-")}</td>
          <td>${escapeHtml(record.joined || "-")}</td>
        </tr>
      `;
    })
    .join("");

  summaryBox.innerHTML = `
    <div class="success-message">
      Import completed successfully.
      ${summary.importedRows} record(s) imported.
      ${summary.invalidRows + summary.duplicateRows} row(s) skipped.
    </div>

    <table class="import-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Joined</th>
        </tr>
      </thead>

      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    ${
      importedRecords.length > 10
        ? `<p class="table-note">Showing first 10 imported records only.</p>`
        : ""
    }
  `;
}

function resetPreviewOnly() {
  previewValidRecords = [];
  previewInvalidRecords = [];

  previewSection.classList.add("hidden");
  validPreviewTableBody.innerHTML = "";
  invalidPreviewTableBody.innerHTML = "";
  validPreviewNote.textContent = "";
  invalidPreviewNote.textContent = "";
}

function resetAllImportState() {
  previewValidRecords = [];
  previewInvalidRecords = [];

  memberFileInput.value = "";
  selectedFileName.textContent = "No file selected";

  totalRowsElement.textContent = "0";
  importedRowsElement.textContent = "0";
  invalidRowsElement.textContent = "0";
  duplicateRowsElement.textContent = "0";

  issueList.innerHTML = `
    <p class="dm-empty-message">No issues detected yet.</p>
  `;

  previewSection.classList.add("hidden");
  validPreviewTableBody.innerHTML = "";
  invalidPreviewTableBody.innerHTML = "";
  validPreviewNote.textContent = "";
  invalidPreviewNote.textContent = "";

  setProgress(0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}