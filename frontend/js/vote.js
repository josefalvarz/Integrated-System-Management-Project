let currentUser = null;
let selectedElectionId = null;

window.addEventListener("DOMContentLoaded", async () => {
  currentUser = JSON.parse(sessionStorage.getItem("loggedInUser"));

  if (!currentUser) {
    window.location.href = "./login.html";
    return;
  }

  if (isAdmin()) {
    alert("Administrators should use the E-Voting Management page.");
    window.location.href = "./election.html";
    return;
  }

  applyRoleBasedAccess();
  updateSidebarUserInfo();
  loadOpenElections();

  document
    .getElementById("backToOpenElectionsBtn")
    .addEventListener("click", goBackToOpenElections);

  document
    .getElementById("voteForm")
    .addEventListener("submit", submitVote);
});

function isAdmin() {
  const role = (currentUser.role || "").toLowerCase();
  return role === "admin" || role === "administrator";
}

function applyRoleBasedAccess() {
  const admin = isAdmin();

  document.querySelectorAll(".admin-only").forEach((element) => {
    element.style.display = admin ? "" : "none";
  });

  document.querySelectorAll(".member-only").forEach((element) => {
    element.style.display = admin ? "none" : "";
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

// S23 — Load open elections for members
async function loadOpenElections() {
  const list = document.getElementById("openElectionList");

  try {
    const res = await fetch("/api/elections");
    const elections = await res.json();

    if (res.status === 401) {
      window.location.href = "./login.html";
      return;
    }

    if (!Array.isArray(elections) || elections.length === 0) {
      list.innerHTML = `
        <p class="vote-empty-message">
          There are no open elections available right now.
        </p>
      `;
      return;
    }

    list.innerHTML = elections
      .filter((election) => election.status === "Open")
      .map((election) => {
        return `
          <div class="vote-election-item" onclick="viewElectionForVoting(${election.id})">
            <strong>${escapeHtml(election.title)}</strong>
            <p>${escapeHtml(election.description || "No description")}</p>
            <small>${election.start_date} → ${election.end_date}</small>
          </div>
        `;
      })
      .join("");

    if (!list.innerHTML.trim()) {
      list.innerHTML = `
        <p class="vote-empty-message">
          There are no open elections available right now.
        </p>
      `;
    }
  } catch (err) {
    list.innerHTML = `
      <p class="vote-empty-message error">
        Error loading open elections.
      </p>
    `;
  }
}

// S23 — View candidates/options for selected election
async function viewElectionForVoting(electionId) {
  selectedElectionId = electionId;

  try {
    const res = await fetch(`/api/elections/${electionId}`);
    const election = await res.json();

    if (res.status === 401) {
      window.location.href = "./login.html";
      return;
    }

    if (!res.ok) {
      alert(election.error || "Error loading election.");
      return;
    }

    if (election.status !== "Open") {
      alert("This election is not open for voting.");
      loadOpenElections();
      return;
    }

    document.getElementById("voteElectionTitle").textContent = election.title;
    document.getElementById("voteElectionDescription").textContent =
      election.description || "No description provided.";
    document.getElementById("voteElectionDates").textContent =
      `${election.start_date} → ${election.end_date}`;

    loadCandidatesForVoting(election.candidates);

    document.getElementById("openElectionsSection").style.display = "none";
    document.getElementById("voteDetailSection").style.display = "block";

    const submitVoteBtn = document.getElementById("submitVoteBtn");
    submitVoteBtn.disabled = false;
    submitVoteBtn.textContent = "Submit Vote";

    showMessage(document.getElementById("voteMessage"), "", "");
  } catch (err) {
    alert("Server error while loading election.");
  }
}

// S23 — Display candidates/options
function loadCandidatesForVoting(candidates) {
  const candidateList = document.getElementById("voteCandidateList");

  if (!Array.isArray(candidates) || candidates.length === 0) {
    candidateList.innerHTML = `
      <p class="vote-empty-message">
        No candidates are available for this election.
      </p>
    `;

    document.getElementById("submitVoteBtn").disabled = true;
    return;
  }

  candidateList.innerHTML = candidates
    .map((candidate) => {
      return `
        <label class="vote-candidate-option">
          <input type="radio" name="candidateId" value="${candidate.id}">
          <span>${escapeHtml(candidate.name)}</span>
        </label>
      `;
    })
    .join("");
}

// S23 — Submit vote
async function submitVote(event) {
  event.preventDefault();

  const msg = document.getElementById("voteMessage");
  const selectedCandidate = document.querySelector(
    'input[name="candidateId"]:checked'
  );

  if (!selectedCandidate) {
    showMessage(msg, "Please select one candidate before submitting.", "error");
    return;
  }

  const confirmVote = confirm(
    "Are you sure you want to submit this vote? You cannot vote again in this election."
  );

  if (!confirmVote) return;

  try {
    const res = await fetch(`/api/elections/${selectedElectionId}/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        candidateId: selectedCandidate.value
      })
    });

    const data = await res.json();

    if (res.status === 401) {
      window.location.href = "./login.html";
      return;
    }

    if (res.ok) {
      showMessage(
        msg,
        data.message || "Vote submitted successfully. Thank you for voting.",
        "success"
      );

      document.querySelectorAll('input[name="candidateId"]').forEach((input) => {
        input.disabled = true;
      });

      const submitVoteBtn = document.getElementById("submitVoteBtn");
      submitVoteBtn.disabled = true;
      submitVoteBtn.textContent = "Vote Submitted";
    } else {
      showMessage(
        msg,
        data.error || "Error submitting vote.",
        "error"
      );
    }
  } catch (err) {
    showMessage(
      msg,
      "Server error. Please try again.",
      "error"
    );
  }
}

function goBackToOpenElections() {
  selectedElectionId = null;

  document.getElementById("voteDetailSection").style.display = "none";
  document.getElementById("openElectionsSection").style.display = "block";

  loadOpenElections();
}

function showMessage(element, text, type) {
  element.textContent = text;

  element.classList.remove("success", "error");

  if (type) {
    element.classList.add(type);
  }
}

// Small protection against displaying raw HTML from database text
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}