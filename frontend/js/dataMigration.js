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

if (loggedInUser) {
  const displayName = loggedInUser.name || loggedInUser.email || "Admin";

  sidebarUserName.textContent = displayName;
  sidebarUserRole.textContent = loggedInUser.role || "admin";
  userInitials.textContent = displayName.charAt(0).toUpperCase();
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", function () {
    sessionStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
  });
}

memberFileInput.addEventListener("change", function () {
  if (memberFileInput.files.length > 0) {
    selectedFileName.textContent = memberFileInput.files[0].name;
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

  setLoadingState(true);

  try {
    const response = await fetch("/api/data-migration/import", {
      method: "POST",
      headers: {
        "x-user-role": loggedInUser.role,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Import failed.");
    }

    updateSummary(data.summary);
    setProgress(100);
  } catch (error) {
    alert(error.message);
    setProgress(0);
  } finally {
    setLoadingState(false);
  }
});

function setLoadingState(isLoading) {
  const button = importForm.querySelector("button");

  if (isLoading) {
    button.disabled = true;
    button.textContent = "Importing...";
    setProgress(35);
  } else {
    button.disabled = false;
    button.textContent = "Import member data";
  }
}

function setProgress(percent) {
  progressFill.style.width = `${percent}%`;
  pipelineStatus.textContent = `${percent}%`;
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
      <p class="empty-message">No issues detected. All rows were valid.</p>
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}