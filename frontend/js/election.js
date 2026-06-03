let currentUser = null;
let currentElectionId = null;

// Load user and elections on page load
window.addEventListener("DOMContentLoaded", async () => {
  currentUser = JSON.parse(sessionStorage.getItem("loggedInUser"));

  if (!currentUser) {
    window.location.href = "./login.html";
    return;
  }

  applyRoleBasedAccess();
  updateSidebarUserInfo();
  loadElections();

  document.getElementById("createElectionBtn").addEventListener("click", createElection);
  document.getElementById("addCandidateBtn").addEventListener("click", addCandidate);
  document.getElementById("backBtn").addEventListener("click", goBackToElections);
  document.getElementById("openElectionBtn").addEventListener("click", openElection);
  document.getElementById("submitVoteBtn").addEventListener("click", submitVote);
});

// Check if current user is admin
function isAdmin() {
  const role = (currentUser.role || "").toLowerCase();
  return role === "admin" || role === "administrator";
}

// Hide admin-only elements for members
function applyRoleBasedAccess() {
  const admin = isAdmin();

  document.querySelectorAll(".admin-only").forEach((element) => {
    element.style.display = admin ? "" : "none";
  });

  const createSection = document.getElementById("createSection");
  const addCandidateSection = document.getElementById("addCandidateSection");

  if (createSection) {
    createSection.style.display = admin ? "block" : "none";
  }

  if (addCandidateSection) {
    addCandidateSection.style.display = "none";
  }
}

// Update sidebar name, role, and initials
function updateSidebarUserInfo() {
  const name = currentUser.name || currentUser.email || "User";
  const role = currentUser.role || "member";

  const userNameElement = document.getElementById("userName");
  const userRoleElement = document.getElementById("userRole");
  const userInitialsElement = document.getElementById("userInitials");

  if (userNameElement) {
    userNameElement.textContent = name;
  }

  if (userRoleElement) {
    userRoleElement.textContent = role.charAt(0).toUpperCase() + role.slice(1);
  }

  if (userInitialsElement) {
    const initials = name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();

    userInitialsElement.textContent = initials || "U";
  }
}

// S20 — Load all elections
async function loadElections() {
  try {
    const res = await fetch("/api/elections");
    const elections = await res.json();
    const list = document.getElementById("electionList");

    if (!Array.isArray(elections) || elections.length === 0) {
      list.innerHTML = "<p>No elections found.</p>";
      return;
    }

    list.innerHTML = elections
  .map(
    (e) => `
      <div class="election-item">
        <div style="cursor:pointer" onclick="viewElection(${e.id})">
          <strong>${e.title}</strong>
          <p>${e.status} | ${e.start_date} → ${e.end_date}</p>
        </div>

        ${
          isAdmin()
            ? `<button class="profile-btn-ghost" onclick="deleteElection(${e.id})">Delete</button>`
            : ""
        }
      </div>
    `
  )
  .join("");
  } catch {
    document.getElementById("electionList").innerHTML =
      "<p>Error loading elections.</p>";
  }
}

// S20 — Create election
async function createElection() {
  if (!isAdmin()) {
    alert("Only administrators can create elections.");
    return;
  }

  const title = document.getElementById("electionTitle").value.trim();
  const description = document.getElementById("electionDesc").value.trim();
  const startDate = document.getElementById("electionStart").value;
  const endDate = document.getElementById("electionEnd").value;
  const msg = document.getElementById("createMessage");

  if (!title || !startDate || !endDate) {
    return showMessage(msg, "Title, start date and end date are required.", "error");
  }

  if (endDate <= startDate) {
    return showMessage(msg, "End date must be after start date.", "error");
  }

  try {
    const res = await fetch("/api/elections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        description,
        startDate,
        endDate
      })
    });

    const data = await res.json();

    if (res.ok) {
      showMessage(msg, data.message || "Election created successfully.", "success");

      document.getElementById("electionTitle").value = "";
      document.getElementById("electionDesc").value = "";
      document.getElementById("electionStart").value = "";
      document.getElementById("electionEnd").value = "";

      loadElections();
    } else {
      showMessage(msg, data.error || "Error creating election.", "error");
    }
  } catch {
    showMessage(msg, "Server error. Please try again.", "error");
  }
}

// S21 — View election detail with candidates
async function viewElection(id) {
  currentElectionId = id;

  try {
    const res = await fetch(`/api/elections/${id}`);
    const election = await res.json();

    document.getElementById("detailTitle").textContent = election.title;
    document.getElementById("detailDesc").textContent =
      election.description || "No description";
    document.getElementById("detailDates").textContent =
      `${election.start_date} → ${election.end_date}`;
    document.getElementById("detailStatus").textContent =
      `Status: ${election.status}`;
    const openElectionBtn = document.getElementById("openElectionBtn");
    const openElectionMessage = document.getElementById("openElectionMessage");

    if (openElectionMessage) {
      openElectionMessage.textContent = "";
    }

    if (openElectionBtn) {
      openElectionBtn.style.display =
        isAdmin() && election.status === "Draft" ? "inline-block" : "none";
    }
    const voteSection = document.getElementById("voteSection");
    const voteMessage = document.getElementById("voteMessage");

    if (voteMessage) {
      voteMessage.textContent = "";
    }

    if (voteSection) {
      voteSection.style.display =
      !isAdmin() && election.status === "Open" ? "block" : "none";
    }
    loadCandidates(election.candidates);

    document.getElementById("electionList").parentElement.style.display = "none";
    document.getElementById("detailSection").style.display = "block";

    const addCandidateSection = document.getElementById("addCandidateSection");
    if (addCandidateSection) {
      addCandidateSection.style.display = isAdmin() ? "grid" : "none";
    }
  } catch {
    alert("Error loading election details.");
  }
}

// S21/S23 — Load candidates
function loadCandidates(candidates) {
  const list = document.getElementById("candidateList");

  if (!candidates || candidates.length === 0) {
    list.innerHTML = "<p>No candidates have been added yet.</p>";
    return;
  }

  const warning =
    candidates.length < 2 && isAdmin()
      ? '<p style="color: orange;">⚠️ Add at least 2 candidates before opening the election.</p>'
      : "";

  list.innerHTML =
    warning +
    candidates
      .map((c) => {
        if (isAdmin()) {
          return `
            <div class="candidate-item">
              <span>• ${c.name}</span>
              <button class="profile-btn-ghost" onclick="removeCandidate(${c.id})">Remove</button>
            </div>
          `;
        }

        return `
          <label class="candidate-item">
            <input type="radio" name="candidateVote" value="${c.id}">
            <span>${c.name}</span>
          </label>
        `;
      })
      .join("");
}

// S21 — Add candidate
async function addCandidate() {
  if (!isAdmin()) {
    alert("Only administrators can add candidates.");
    return;
  }

  const name = document.getElementById("candidateName").value.trim();
  const msg = document.getElementById("candidateMessage");

  if (!name) {
    return showMessage(msg, "Candidate name is required.", "error");
  }

  try {
    const res = await fetch(`/api/elections/${currentElectionId}/candidates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name })
    });

    const data = await res.json();

    if (res.ok) {
      document.getElementById("candidateName").value = "";

      if (data.warning) {
        showMessage(msg, `${data.message} ⚠️ ${data.warning}`, "error");
      } else {
        showMessage(msg, data.message || "Candidate added successfully.", "success");
      }

      viewElection(currentElectionId);
    } else {
      showMessage(msg, data.error || "Error adding candidate.", "error");
    }
  } catch {
    showMessage(msg, "Server error. Please try again.", "error");
  }
}

// S21 — Remove candidate
async function removeCandidate(candidateId) {
  if (!isAdmin()) {
    alert("Only administrators can remove candidates.");
    return;
  }

  try {
    const res = await fetch(
      `/api/elections/${currentElectionId}/candidates/${candidateId}`,
      {
        method: "DELETE"
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error removing candidate.");
      return;
    }

    viewElection(currentElectionId);
  } catch {
    alert("Error removing candidate.");
  }
}

// Back button
function goBackToElections() {
  document.getElementById("detailSection").style.display = "none";
  document.getElementById("electionList").parentElement.style.display = "block";

  const addCandidateSection = document.getElementById("addCandidateSection");
  if (addCandidateSection) {
    addCandidateSection.style.display = "none";
  }

  currentElectionId = null;
}
// S22 — Open election
async function openElection() {
  const msg = document.getElementById("openElectionMessage");

  try {
    const res = await fetch(`/api/elections/${currentElectionId}/open`, {
      method: "PATCH"
    });

    const data = await res.json();

    if (res.ok) {
      showMessage(
        msg,
        data.message || "Election opened successfully.",
        "success"
      );

      viewElection(currentElectionId);
      loadElections();
    } else {
      showMessage(
        msg,
        data.error || "Error opening election.",
        "error"
      );
    }
  } catch {
    showMessage(
      msg,
      "Server error. Please try again.",
      "error"
    );
  }
}
// S23 — Submit vote
async function submitVote() {
  if (isAdmin()) {
    alert("Administrators cannot vote from this view.");
    return;
  }

  const selectedCandidate = document.querySelector(
    'input[name="candidateVote"]:checked'
  );

  const msg = document.getElementById("voteMessage");

  if (!selectedCandidate) {
    return showMessage(msg, "Please select one candidate.", "error");
  }

  try {
    const res = await fetch(`/api/elections/${currentElectionId}/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        candidateId: selectedCandidate.value
      })
    });

    const data = await res.json();

    if (res.ok) {
      showMessage(
        msg,
        data.message || "Vote submitted successfully.",
        "success"
      );

      document.getElementById("submitVoteBtn").disabled = true;
      document.getElementById("submitVoteBtn").textContent = "Vote Submitted";
    } else {
      showMessage(
        msg,
        data.error || "Error submitting vote.",
        "error"
      );
    }
  } catch {
    showMessage(
      msg,
      "Server error. Please try again.",
      "error"
    );
  }
}
// S22 — Delete election
async function deleteElection(id) {
  if (!isAdmin()) {
    alert("Only administrators can delete elections.");
    return;
  }

  const confirmDelete = confirm("Are you sure you want to delete this election?");

  if (!confirmDelete) return;

  try {
    const res = await fetch(`/api/elections/${id}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error deleting election.");
      return;
    }

    alert(data.message || "Election deleted successfully.");

    if (currentElectionId === id) {
      goBackToElections();
    }

    loadElections();
  } catch {
    alert("Server error. Please try again.");
  }
}
// Show message
function showMessage(el, text, type) {
  el.textContent = text;
  el.classList.remove("success", "error");
  el.classList.add(type);
}