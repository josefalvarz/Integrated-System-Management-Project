document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));

  const searchInput = document.getElementById("memberSearchInput");
  const resultsBody = document.getElementById("memberResultsBody");
  const message = document.getElementById("memberSearchMessage");

  let allMembers = [];

  // 1. Protect page: only logged-in admins can enter
  if (!loggedInUser) {
    window.location.href = "./login.html";
    return;
  }

  if (loggedInUser.role !== "admin") {
    alert("Access denied. Only administrators can access Member Search.");
    window.location.href = "./dashboard.html";
    return;
  }

  // 2. Load members from backend
  async function loadMembers() {
    try {
      const response = await fetch("/api/users", {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Could not load members.");
      }

      const data = await response.json();

      allMembers = data.users || data || [];

      displayMembers(allMembers);
    } catch (error) {
      console.error("Error loading members:", error);
      message.textContent = "Could not load members. Please check the backend server.";
      message.classList.add("error-message");
    }
  }

  // 3. Display members in table
  function displayMembers(members) {
    resultsBody.innerHTML = "";

    if (!members || members.length === 0) {
      message.textContent = "No members found.";
      message.classList.remove("error-message");
      return;
    }

    message.textContent = "";

    members.forEach((member) => {
      const row = document.createElement("tr");
      const isSelf = loggedInUser && member.source === "Registered" && member.id === loggedInUser.id;

      row.innerHTML = `
        <td>${member.name || "N/A"}</td>
        <td>${member.email || "N/A"}</td>
        <td>${member.role || "member"}</td>
        <td>${member.source || "Registered"}</td>
        <td>
          ${isSelf
            ? '<span style="color:#94a3b8;font-size:13px;">—</span>'
            : `<button class="table-action-btn document-danger-btn" data-id="${member.id}" data-source="${member.source || "Registered"}">Delete</button>`
          }
        </td>
      `;

      resultsBody.appendChild(row);
    });
  }

  // 4. Handle delete button clicks (event delegation)
  resultsBody.addEventListener("click", async (e) => {
    const btn = e.target.closest(".document-danger-btn");
    if (!btn) return;

    const id = btn.dataset.id;
    const source = btn.dataset.source;
    const name = btn.closest("tr").querySelector("td").textContent;

    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    btn.disabled = true;
    btn.textContent = "Deleting...";

    try {
      const url = source === "Imported"
        ? `/api/users/imported/${id}`
        : `/api/users/${id}`;

      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Could not delete member.");
        btn.disabled = false;
        btn.textContent = "Delete";
        return;
      }

      btn.closest("tr").remove();
      allMembers = allMembers.filter(
        (m) => !(m.id === Number(id) && (m.source || "Registered") === source)
      );
    } catch {
      alert("Network error. Please try again.");
      btn.disabled = false;
      btn.textContent = "Delete";
    }
  });

  // 5. Search by name, email, or role
  function searchMembers() {
    const searchValue = searchInput.value.toLowerCase().trim();

    const filteredMembers = allMembers.filter((member) => {
      const name = (member.name || "").toLowerCase();
      const email = (member.email || "").toLowerCase();
      const role = (member.role || "").toLowerCase();

      return (
        name.includes(searchValue) ||
        email.includes(searchValue) ||
        role.includes(searchValue)
      );
    });

    displayMembers(filteredMembers);
  }

  searchInput.addEventListener("input", searchMembers);

  loadMembers();
});