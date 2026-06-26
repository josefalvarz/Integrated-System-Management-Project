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
      const isActive = member.is_active !== 0;
      const source = member.source || "Registered";

      row.innerHTML = `
        <td>${member.name || "N/A"}</td>
        <td>${member.email || "N/A"}</td>
        <td>${member.role || "member"}</td>
        <td>${source}</td>
        <td style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          ${isSelf
            ? '<span style="color:#94a3b8;font-size:13px;">—</span>'
            : `<button class="status-pill ${isActive ? "active" : "inactive"} member-status-btn"
                 data-id="${member.id}" data-source="${source}" data-active="${isActive ? 1 : 0}">
                 ${isActive ? "Deactivate" : "Activate"}
               </button>
               <button class="table-action-btn document-danger-btn member-delete-btn"
                 data-id="${member.id}" data-source="${source}">Delete</button>`
          }
        </td>
      `;

      resultsBody.appendChild(row);
    });
  }

  // 4. Handle action button clicks (event delegation)
  resultsBody.addEventListener("click", async (e) => {
    const statusBtn = e.target.closest(".member-status-btn");
    const deleteBtn = e.target.closest(".member-delete-btn");

    if (statusBtn) {
      await handleStatusToggle(statusBtn);
    } else if (deleteBtn) {
      await handleDelete(deleteBtn);
    }
  });

  async function handleStatusToggle(btn) {
    const id = btn.dataset.id;
    const source = btn.dataset.source;
    const currentActive = Number(btn.dataset.active);
    const newActive = currentActive === 1 ? 0 : 1;

    btn.disabled = true;
    btn.textContent = "Updating...";

    try {
      const url = source === "Imported"
        ? `/api/users/imported/${id}/status`
        : `/api/users/${id}/status`;

      const res = await fetch(url, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Could not update status.");
        btn.disabled = false;
        btn.textContent = currentActive === 1 ? "Deactivate" : "Activate";
        return;
      }

      btn.dataset.active = newActive;
      btn.textContent = newActive === 1 ? "Deactivate" : "Activate";
      btn.className = `status-pill ${newActive === 1 ? "active" : "inactive"} member-status-btn`;
      btn.disabled = false;

      const cached = allMembers.find(
        (m) => m.id === Number(id) && (m.source || "Registered") === source
      );
      if (cached) cached.is_active = newActive;
    } catch {
      alert("Network error. Please try again.");
      btn.disabled = false;
      btn.textContent = currentActive === 1 ? "Deactivate" : "Activate";
    }
  }

  async function handleDelete(btn) {
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
  }

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
